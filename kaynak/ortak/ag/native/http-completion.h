// Incremental HTTP framing for both Pepper and WebAssembly HTTPS helpers.
#ifndef FILM_HTTP_COMPLETION_H
#define FILM_HTTP_COMPLETION_H
#include "http-response.h"

namespace film_http_completion {
// Inspects the accumulated wire buffer without copying the body or rescanning it.
// The caller still owns request cancellation, timeout, TLS and the original limits.
class Completion {
 public:
  enum State { pending, complete, invalid };
  explicit Completion(size_t limit) : state_(pending), phase_(headers), limit_(limit),
    start_(0), at_(0), scan_(0), length_(0), decoded_(0), chunk_(0), end_(0),
    inspected_(0), interim_(0), too_large_(false), bodyless_(false), status_(0), trailer_at_(0) {}
  State Inspect(const std::string& raw, bool eof) {
    if (state_ != pending) return state_;
    if (raw.size() < inspected_) return Bad("Response buffer shrank");
    inspected_ = raw.size();
    for (;;) {
      if (phase_ == headers) {
        size_t split = raw.find("\r\n\r\n", scan_);
        if (split == std::string::npos) {
          if (raw.size() - start_ > film_http::kHeaderLimit || raw.size() > 65536)
            return Bad("Header limit");
          scan_ = raw.size() > 3 ? raw.size() - 3 : start_;
          return eof ? Bad("Incomplete headers") : pending;
        }
        if (split - start_ > film_http::kHeaderLimit || split + 4 > 65536)
          return Bad("Header limit");
        size_t line = raw.find("\r\n", start_);
        if (line == std::string::npos || line - start_ < 12 ||
            (raw.compare(start_, 9, "HTTP/1.1 ") && raw.compare(start_, 9, "HTTP/1.0 ")))
          return Bad("Invalid status line");
        std::string status = raw.substr(start_ + 9, 3);
        if (status[0] < '1' || status[0] > '5' || status[1] < '0' || status[1] > '9' ||
            status[2] < '0' || status[2] > '9' || (line - start_ > 12 && raw[start_ + 12] != ' '))
          return Bad("Invalid status code");
        status_ = std::atoi(status.c_str());
        std::map<std::string, std::string> fields;
        for (size_t pos = line + 2; pos < split;) {
          size_t next = raw.find("\r\n", pos), colon = raw.find(':', pos);
          if (next == std::string::npos || colon == std::string::npos || colon >= next || colon == pos)
            return Bad("Invalid header");
          std::string key = film_http::Lower(raw.substr(pos, colon - pos));
          std::string value = film_http::Trim(raw.substr(colon + 1, next - colon - 1));
          if (!Name(key) || !Value(value)) return Bad("Invalid header characters");
          if (fields.count(key) && fields[key] != value &&
              (key == "content-length" || key == "transfer-encoding" ||
               key == "content-encoding" || key == "location")) return Bad("Conflicting headers");
          fields[key] = value; pos = next + 2;
        }
        const bool cl = fields.count("content-length") != 0, te = fields.count("transfer-encoding") != 0;
        if (cl && te) return Bad("Ambiguous framing");
        if (cl) {
          const std::string& n = fields["content-length"];
          if (n.empty() || n.size() > 8 || n.find_first_not_of("0123456789") != std::string::npos)
            return Bad("Invalid content length");
          length_ = static_cast<size_t>(std::strtoul(n.c_str(), NULL, 10));
        }
        if (te && film_http::Lower(fields["transfer-encoding"]) != "chunked")
          return Bad("Unsupported transfer encoding");
        if (status_ < 200) {
          if (status_ == 101 || cl || te || ++interim_ > 8) return Bad("Unsupported interim response");
          start_ = split + 4; scan_ = start_; continue;
        }
        if (status_ == 204 && (cl || te)) return Bad("Invalid no-content framing");
        location_ = fields["location"]; mime_type_ = fields["content-type"]; content_range_ = fields["content-range"];
        bodyless_ = status_ == 204 || status_ == 304;
        if (bodyless_) return Done(raw, split + 4);
        if (fields.count("content-encoding") && film_http::Lower(fields["content-encoding"]) != "identity")
          return Bad("Unsupported content encoding");
        at_ = split + 4;
        if (cl && length_ > limit_) return Large();
        phase_ = te ? chunk_size : cl ? fixed_body : close_body; scan_ = at_;
      } else if (phase_ == fixed_body) {
        size_t bytes = raw.size() - at_;
        if (bytes > length_) return Bad("Unexpected trailing bytes");
        if (bytes == length_) return Done(raw, raw.size());
        return eof ? Bad("Incomplete fixed body") : pending;
      } else if (phase_ == close_body) {
        if (raw.size() - at_ > limit_) return Large();
        return eof ? Done(raw, raw.size()) : pending;
      } else if (phase_ == chunk_size) {
        size_t next = raw.find("\r\n", scan_);
        if (next == std::string::npos) {
          if (raw.size() - at_ > 80) return Bad("Chunk line limit");
          scan_ = raw.size() > at_ ? raw.size() - 1 : at_;
          return eof ? Bad("Incomplete chunk size") : pending;
        }
        if (next - at_ > 80) return Bad("Chunk line limit");
        std::string line = raw.substr(at_, next - at_);
        if (!Value(line)) return Bad("Invalid chunk extension");
        std::string hex = line.substr(0, line.find(';'));
        if (hex.empty() || hex.size() > 8 || hex.find_first_not_of("0123456789abcdefABCDEF") != std::string::npos)
          return Bad("Invalid chunk size");
        chunk_ = static_cast<size_t>(std::strtoul(hex.c_str(), NULL, 16));
        if (chunk_ > limit_ - decoded_) return Large();
        at_ = next + 2; scan_ = at_; phase_ = chunk_ ? chunk_body : trailers;
      } else if (phase_ == chunk_body) {
        if (raw.size() - at_ < chunk_ + 2) return eof ? Bad("Incomplete chunk") : pending;
        if (raw.compare(at_ + chunk_, 2, "\r\n")) return Bad("Invalid chunk terminator");
        decoded_ += chunk_; at_ += chunk_ + 2; scan_ = at_; phase_ = chunk_size;
      } else {
        size_t next = raw.find("\r\n", scan_);
        if (next == std::string::npos) {
          if (raw.size() - at_ > film_http::kHeaderLimit) return Bad("Trailer limit");
          scan_ = raw.size() > at_ ? raw.size() - 1 : at_;
          return eof ? Bad("Incomplete trailers") : pending;
        }
        if (next - at_ > film_http::kHeaderLimit || next + 2 - trailer_start() > film_http::kHeaderLimit)
          return Bad("Trailer limit");
        if (next == at_) return Done(raw, next + 2);
        size_t colon = raw.find(':', at_);
        if (colon == std::string::npos || colon >= next || colon == at_) return Bad("Invalid trailer");
        std::string key = film_http::Lower(raw.substr(at_, colon - at_));
        if (!Name(key) || !Value(raw.substr(colon + 1, next - colon - 1)) ||
            key == "content-length" || key == "transfer-encoding" || key == "content-encoding" ||
            key == "host" || key == "location") return Bad("Unsafe trailer");
        at_ = next + 2; scan_ = at_;
      }
    }
  }
  const std::string& error() const { return error_; }
  bool tooLarge() const { return too_large_; }
  size_t finalStart() const { return start_; }
  size_t finalEnd() const { return end_; }
  // Call only after Inspect==complete, never use this to turn an incomplete body into success.
  void ParseComplete(std::string* raw, film_http::Response& out) const {
    if (state_ != complete || !raw || raw->size() != end_) { out.error = "Unverified message"; return; }
    if (bodyless_) { out.status = status_; out.location = location_; out.mimeType = mime_type_; out.contentRange = content_range_; std::string().swap(*raw); return; }
    if (start_) raw->erase(0, start_);
    film_http::ParseInto(*raw, limit_, raw, out);
    std::string().swap(*raw);
  }
  film_http::Response ParseComplete(std::string* raw) const {
    film_http::Response out; ParseComplete(raw, out); return out;
  }
 private:
  enum Phase { headers, fixed_body, close_body, chunk_size, chunk_body, trailers };
  static bool Name(const std::string& s) {
    if (s.empty()) return false;
    for (size_t i = 0; i < s.size(); ++i) {
      unsigned char c = static_cast<unsigned char>(s[i]);
      if (!(c >= 'a' && c <= 'z') && !(c >= '0' && c <= '9') &&
          std::string("!#$%&'*+-.^_`|~").find(c) == std::string::npos) return false;
    }
    return true;
  }
  static bool Value(const std::string& s) {
    for (size_t i = 0; i < s.size(); ++i) {
      unsigned char c = static_cast<unsigned char>(s[i]);
      if ((c < 32 && c != 9) || c == 127) return false;
    }
    return true;
  }
  size_t trailer_start() { if (!trailer_at_) trailer_at_ = at_; return trailer_at_; }
  State Bad(const char* message) { error_ = message; state_ = invalid; return state_; }
  State Large() { too_large_ = true; return Bad("Body limit"); }
  State Done(const std::string& raw, size_t end) {
    if (raw.size() != end) return Bad("Unexpected trailing bytes");
    end_ = end; state_ = complete; return state_;
  }
  State state_; Phase phase_; size_t limit_, start_, at_, scan_, length_, decoded_, chunk_, end_, inspected_;
  unsigned int interim_; bool too_large_, bodyless_; int status_; std::string error_;
  size_t trailer_at_;
  std::string location_, mime_type_, content_range_;
};
}  // namespace film_http_completion
#endif

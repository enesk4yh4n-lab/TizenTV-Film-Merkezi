// Film Merkezi HTTPS helper. See LICENSE for project terms.
#ifndef FILM_MERKEZI_HTTP_RESPONSE_H
#define FILM_MERKEZI_HTTP_RESPONSE_H
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <cstring>
#include <map>
#include <string>

namespace film_http {
const size_t kBodyLimit = 2 * 1024 * 1024;
const size_t kBinaryBodyLimit = 32 * 1024 * 1024;
const size_t kWireOverheadLimit = 65536;
const size_t kHeaderLimit = 16 * 1024;
struct Response { int status; std::string body, location, error, mimeType, contentRange; bool tooLarge; Response() : status(0),tooLarge(false) {} };
inline std::string Lower(std::string value) {
  for (size_t i = 0; i < value.size(); ++i) value[i] = static_cast<char>(std::tolower(static_cast<unsigned char>(value[i])));
  return value;
}
inline std::string Trim(const std::string& text) {
  size_t a = text.find_first_not_of(" \t"), b = text.find_last_not_of(" \t");
  return a == std::string::npos ? "" : text.substr(a, b - a + 1);
}
inline void AppendWire(std::string& raw, const char* bytes, size_t count, size_t limit) {
  // Bound capacity growth for large opt-in responses on the fixed WASM heap.
  if (limit >= 16 * 1024 * 1024 && raw.size() + count > 8 * 1024 * 1024 &&
      raw.capacity() < limit + kWireOverheadLimit) raw.reserve(limit + kWireOverheadLimit);
  raw.append(bytes, count);
}
inline void ParseInto(const std::string& raw, size_t bodyLimit, std::string* owned, Response& out) {
  size_t split = raw.find("\r\n\r\n"), line = raw.find("\r\n");
  if (split == std::string::npos || split > kHeaderLimit || line == std::string::npos || line > split) { out.error = "HTTP basligi gecersiz"; return; }
  if (raw.compare(0, 9, "HTTP/1.1 ") && raw.compare(0, 9, "HTTP/1.0 ")) { out.error = "HTTP surumu gecersiz"; return; }
  if (line < 12 || raw[9] < '1' || raw[9] > '5' || raw[10] < '0' || raw[10] > '9' || raw[11] < '0' || raw[11] > '9' || (line > 12 && raw[12] != ' ')) { out.error = "HTTP durum kodu gecersiz"; return; }
  out.status = std::atoi(raw.substr(9, 3).c_str());
  std::map<std::string, std::string> headers;
  for (size_t at = line + 2; at < split;) {
    size_t end = raw.find("\r\n", at), colon = raw.find(':', at);
    if (end == std::string::npos || colon == std::string::npos || colon >= end) { out.error = "HTTP alanlari gecersiz"; return; }
    std::string key = Lower(raw.substr(at, colon - at)), value = Trim(raw.substr(colon + 1, end - colon - 1));
    if (headers.count(key) && headers[key] != value && (key == "content-length" || key == "transfer-encoding" || key == "content-encoding" || key == "location")) { out.error = "Cakisan HTTP alanlari"; return; }
    headers[key] = value; at = end + 2;
  }
  out.location = headers["location"];out.mimeType=headers["content-type"];out.contentRange=headers["content-range"];
  if (headers.count("content-encoding") && Lower(headers["content-encoding"]) != "identity") { out.error = "Desteklenmeyen HTTP sikistirmasi"; return; }
  std::string payload;
  if (owned && owned == &raw) { owned->erase(0, split + 4); payload.swap(*owned); }
  else payload = raw.substr(split + 4);
  if (headers.count("transfer-encoding")) {
    if (Lower(headers["transfer-encoding"]) != "chunked" || headers.count("content-length")) { out.error = "Belirsiz HTTP aktarimi"; return; }
    size_t at = 0, written = 0;
    for (;;) {
      size_t end = payload.find("\r\n", at);
      if (end == std::string::npos || end - at > 80) { out.error = "Eksik HTTP parcasi"; return; }
      std::string size = payload.substr(at, end - at); size = size.substr(0, size.find(';'));
      if (size.empty() || size.find_first_not_of("0123456789abcdefABCDEF") != std::string::npos || size.size() > 8) { out.error = "HTTP parca boyutu gecersiz"; return; }
      unsigned long count = std::strtoul(size.c_str(), NULL, 16); at = end + 2;
      if (!count) {
        if (payload.compare(at, 2, "\r\n") && payload.find("\r\n\r\n", at) == std::string::npos) { out.error = "Eksik HTTP sonu"; return; }
        payload.resize(written); out.body.swap(payload); return;
      }
      if(count>bodyLimit-written){out.tooLarge=true;out.error="HTTP boyut siniri";return;}
      if (at > payload.size() || count > payload.size() - at || payload.compare(at + count, 2, "\r\n")) { out.error = "Eksik veya buyuk HTTP parcasi"; return; }
      std::memmove(&payload[written], &payload[at], count);
      written += count; at += count + 2;
    }
  }
  if (headers.count("content-length")) {
    const std::string& value = headers["content-length"];
    if (value.empty() || value.size() > 8 || value.find_first_not_of("0123456789") != std::string::npos || std::strtoul(value.c_str(), NULL, 10) != payload.size()) { out.error = "Eksik HTTP govdesi"; return; }
  }
  if (payload.size() > bodyLimit) { out.tooLarge=true;out.error = "HTTP boyut siniri"; return; }
  out.body.swap(payload);
}
inline Response Parse(const std::string& raw, size_t bodyLimit = kBodyLimit, std::string* owned = NULL) {
  Response out; ParseInto(raw, bodyLimit, owned, out); return out;
}
}  // namespace film_http
#endif

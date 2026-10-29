// Film Merkezi: narrow HTTPS fallback for legacy Samsung TVs.
// Pepper supplies asynchronous TCP; pinned Mbed TLS validates bundled public CAs.
#include <map>
#include <string>
#include <cstring>
#include <sys/time.h>
#include <nacl/nacl_random.h>
#include "mbedtls/ssl.h"
#include "mbedtls/x509_crt.h"
#include "mbedtls/platform_util.h"
#include "ppapi/c/pp_errors.h"
#include "ppapi/cpp/completion_callback.h"
#include "ppapi/cpp/core.h"
#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/private/host_resolver_private.h"
#include "ppapi/cpp/private/tcp_socket_private.h"
#include "ppapi/cpp/var_dictionary.h"
#include "ppapi/utility/completion_callback_factory.h"
#include "http-response.h"
#include "ca-bundle.h"

extern "C" mbedtls_ms_time_t mbedtls_ms_time(void) {
  struct timeval value;
  if (gettimeofday(&value, NULL)) return 0;
  return static_cast<mbedtls_ms_time_t>(value.tv_sec) * 1000 + value.tv_usec / 1000;
}

namespace {
bool Url(const std::string& text, std::string* host, std::string* target) {
  if (text.size() > 4096 || text.compare(0, 8, "https://") || text.find_first_of("\r\n\t #") != std::string::npos) return false;
  size_t slash = text.find('/', 8); if (slash == std::string::npos) return false;
  *host = text.substr(8, slash - 8); *target = text.substr(slash);
  if (*host == "www.ddizi.tel" && (target->compare(0, 8, "/player/") == 0 || target->compare(0, 6, "/izle/") == 0)) return true;
#ifdef FILM_HTTP_QA
  if (*host == "self-signed.badssl.com" || *host == "wrong.host.badssl.com" || *host == "test-streams.mux.dev") return true;
#endif
  return false;
}
bool Referrer(const std::string& text) {
  const std::string prefix = "https://www.ddizi.tel/izle/";
  return text.size() < 4096 && (text == "https://www.ddizi.tel/" || text.compare(0, prefix.size(), prefix) == 0) && text.find_first_of("\r\n\t #") == std::string::npos;
}
class Instance;
class Job {
 public:
  Job(Instance* owner, int id, const std::string& host, const std::string& target, const std::string& referer);
  ~Job() { callbacks_.CancelAll(); socket_.Disconnect(); mbedtls_ssl_free(&ssl_); mbedtls_ssl_config_free(&config_); mbedtls_x509_crt_free(&ca_); }
  void Start();
 private:
  void Resolved(int32_t result);
  void Connected(int32_t result);
  void Written(int32_t result);
  void Read(int32_t result);
  void Pump(int32_t unused);
  void WriteEncrypted(int32_t unused);
  void ReadEncrypted(int32_t unused);
  static int Send(void* context, const unsigned char* data, size_t size);
  static int Receive(void* context, unsigned char* data, size_t size);
  static int Random(void*, unsigned char* data, size_t size);
  void Timeout(int32_t);
  void Fail(const std::string& stage, int32_t code);
  void Finish();
  Instance* owner_; int id_; std::string host_, request_, raw_; size_t written_;
  char buffer_[16384]; unsigned char plain_[16384];
  int tls_state_, transport_error_; bool write_pending_, write_ready_, read_pending_, eof_;
  std::string outgoing_, incoming_; size_t outgoing_at_, incoming_at_;
  mbedtls_ssl_context ssl_; mbedtls_ssl_config config_; mbedtls_x509_crt ca_;
  pp::TCPSocketPrivate socket_; pp::HostResolverPrivate resolver_;
  pp::CompletionCallbackFactory<Job> callbacks_;
};
class Instance : public pp::Instance {
 public:
  explicit Instance(PP_Instance id) : pp::Instance(id) {}
  ~Instance() { while (!jobs_.empty()) Cancel(jobs_.begin()->first); }
  bool Init(uint32_t, const char*[], const char*[]) {
    pp::VarDictionary message; message.Set("kind", "ready"); message.Set("protocol", 1);
    message.Set("tls", pp::TCPSocketPrivate::IsAvailable());
    message.Set("tlsEngine", "MbedTLS 3.6.7");
    message.Set("ipv4", pp::HostResolverPrivate::IsAvailable()); PostMessage(message); return true;
  }
  void HandleMessage(const pp::Var& value) {
    if (!value.is_dictionary()) return;
    pp::VarDictionary message(value); pp::Var id_value = message.Get("id"), kind_value = message.Get("kind");
    if (!id_value.is_int() || id_value.AsInt() <= 0 || !kind_value.is_string()) return;
    int id = id_value.AsInt(); const std::string kind = kind_value.AsString();
    if (kind == "cancel") { Cancel(id); return; }
    if (kind != "request" || jobs_.count(id)) return;
    pp::Var url = message.Get("url"), ref = message.Get("referer"); std::string host, target;
    if (!url.is_string() || !ref.is_string() || !Url(url.AsString(), &host, &target) || (host == "www.ddizi.tel" && !Referrer(ref.AsString()))) { Reply(id, "validation", -1, NULL); return; }
    if (!pp::TCPSocketPrivate::IsAvailable() || jobs_.size() >= 2) { Reply(id, "unavailable", PP_ERROR_NOINTERFACE, NULL); return; }
    jobs_[id] = new Job(this, id, host, target, ref.AsString()); jobs_[id]->Start();
  }
  void Reply(int id, const std::string& stage, int code, const film_http::Response* response) {
    pp::VarDictionary message; message.Set("kind", "result"); message.Set("id", id);
    message.Set("stage", stage); message.Set("code", code);
    if (response) { message.Set("status", response->status); message.Set("body", response->body); message.Set("location", response->location); message.Set("error", response->error); }
    PostMessage(message); Cancel(id);
  }
 private:
  void Cancel(int id) { std::map<int, Job*>::iterator found = jobs_.find(id); if (found == jobs_.end()) return; Job* job = found->second; jobs_.erase(found); delete job; }
  std::map<int, Job*> jobs_;
};
Job::Job(Instance* owner, int id, const std::string& host, const std::string& target, const std::string& referer)
    : owner_(owner), id_(id), host_(host), written_(0), tls_state_(0), transport_error_(0), write_pending_(false), write_ready_(false), read_pending_(false), eof_(false), outgoing_at_(0), incoming_at_(0), socket_(owner), resolver_(owner), callbacks_(this) {
  mbedtls_ssl_init(&ssl_); mbedtls_ssl_config_init(&config_); mbedtls_x509_crt_init(&ca_);
  request_ = "GET " + target + " HTTP/1.1\r\nHost: " + host + "\r\nUser-Agent: Mozilla/5.0\r\nAccept: */*\r\nAccept-Encoding: identity\r\nConnection: close\r\n";
  if (!referer.empty()) request_ += "Referer: " + referer + "\r\n";
  request_ += "\r\n";
}
void Job::Start() {
  pp::Module::Get()->core()->CallOnMainThread(16000, callbacks_.NewCallback(&Job::Timeout));
  if (pp::HostResolverPrivate::IsAvailable()) {
    PP_HostResolver_Private_Hint hint = {PP_NETADDRESSFAMILY_PRIVATE_IPV4, 0};
    int32_t result = resolver_.Resolve(host_, 443, hint, callbacks_.NewCallback(&Job::Resolved));
    if (result != PP_OK_COMPLETIONPENDING) Resolved(result);
  } else {
    int32_t result = socket_.Connect(host_.c_str(), 443, callbacks_.NewCallback(&Job::Connected));
    if (result != PP_OK_COMPLETIONPENDING) Connected(result);
  }
}
void Job::Resolved(int32_t result) {
  if (result != PP_OK) { Fail("dns", result); return; }
  PP_NetAddress_Private address;
  if (!resolver_.GetNetAddress(0, &address)) { Fail("dns", PP_ERROR_NAME_NOT_RESOLVED); return; }
  result = socket_.ConnectWithNetAddress(&address, callbacks_.NewCallback(&Job::Connected));
  if (result != PP_OK_COMPLETIONPENDING) Connected(result);
}
void Job::Connected(int32_t result) {
  if (result != PP_OK) { Fail("connect", result); return; }
  result = mbedtls_x509_crt_parse(&ca_, kCaBundle, sizeof(kCaBundle));
  if (result < 0) { Fail("ca", result); return; }
  result = mbedtls_ssl_config_defaults(&config_, MBEDTLS_SSL_IS_CLIENT, MBEDTLS_SSL_TRANSPORT_STREAM, MBEDTLS_SSL_PRESET_DEFAULT);
  if (result) { Fail("tls-config", result); return; }
  mbedtls_ssl_conf_authmode(&config_, MBEDTLS_SSL_VERIFY_REQUIRED);
  mbedtls_ssl_conf_ca_chain(&config_, &ca_, NULL);
  mbedtls_ssl_conf_rng(&config_, &Job::Random, NULL);
  result = mbedtls_ssl_setup(&ssl_, &config_);
  if (!result) result = mbedtls_ssl_set_hostname(&ssl_, host_.c_str());
  if (result) { Fail("tls-config", result); return; }
  mbedtls_ssl_set_bio(&ssl_, this, &Job::Send, &Job::Receive, NULL);
  Pump(0);
}
int Job::Random(void*, unsigned char* data, size_t size) {
  size_t written = 0;
  return !nacl_secure_random(data, size, &written) && written == size ? 0 : MBEDTLS_ERR_SSL_INTERNAL_ERROR;
}
int Job::Send(void* context, const unsigned char* data, size_t size) {
  Job* job = static_cast<Job*>(context);
  if (job->transport_error_) return MBEDTLS_ERR_SSL_INTERNAL_ERROR;
  if (job->write_ready_) {
    if (size != job->outgoing_.size() || std::memcmp(data, job->outgoing_.data(), size)) return MBEDTLS_ERR_SSL_INTERNAL_ERROR;
    job->write_ready_ = false; job->outgoing_.clear(); return static_cast<int>(size);
  }
  if (!job->write_pending_) {
    job->outgoing_.assign(reinterpret_cast<const char*>(data), size); job->outgoing_at_ = 0; job->write_pending_ = true;
    pp::Module::Get()->core()->CallOnMainThread(0, job->callbacks_.NewCallback(&Job::WriteEncrypted));
  }
  return MBEDTLS_ERR_SSL_WANT_WRITE;
}
int Job::Receive(void* context, unsigned char* data, size_t size) {
  Job* job = static_cast<Job*>(context);
  if (job->transport_error_) return MBEDTLS_ERR_SSL_INTERNAL_ERROR;
  if (job->incoming_at_ < job->incoming_.size()) {
    size_t count = std::min(size, job->incoming_.size() - job->incoming_at_);
    std::memcpy(data, job->incoming_.data() + job->incoming_at_, count); job->incoming_at_ += count;
    if (job->incoming_at_ == job->incoming_.size()) { job->incoming_.clear(); job->incoming_at_ = 0; }
    return static_cast<int>(count);
  }
  if (job->eof_) return 0;
  if (!job->read_pending_) { job->read_pending_ = true; pp::Module::Get()->core()->CallOnMainThread(0, job->callbacks_.NewCallback(&Job::ReadEncrypted)); }
  return MBEDTLS_ERR_SSL_WANT_READ;
}
void Job::WriteEncrypted(int32_t) {
  int32_t result = socket_.Write(outgoing_.data() + outgoing_at_, outgoing_.size() - outgoing_at_, callbacks_.NewCallback(&Job::Written));
  if (result != PP_OK_COMPLETIONPENDING) Written(result);
}
void Job::Written(int32_t result) {
  if (result <= 0) { transport_error_ = result ? result : -1; write_pending_ = false; }
  else {
    outgoing_at_ += result;
    if (outgoing_at_ < outgoing_.size()) { WriteEncrypted(0); return; }
    write_pending_ = false; write_ready_ = true;
  }
  pp::Module::Get()->core()->CallOnMainThread(0, callbacks_.NewCallback(&Job::Pump));
}
void Job::ReadEncrypted(int32_t) {
  int32_t result = socket_.Read(buffer_, sizeof(buffer_), callbacks_.NewCallback(&Job::Read));
  if (result != PP_OK_COMPLETIONPENDING) Read(result);
}
void Job::Read(int32_t result) {
  read_pending_ = false;
  if (result < 0) transport_error_ = result;
  else if (!result) eof_ = true;
  else incoming_.append(buffer_, result);
  pp::Module::Get()->core()->CallOnMainThread(0, callbacks_.NewCallback(&Job::Pump));
}
void Job::Pump(int32_t) {
  for (;;) {
    int result;
    if (!tls_state_) {
      result = mbedtls_ssl_handshake(&ssl_);
      if (result == MBEDTLS_ERR_SSL_WANT_READ || result == MBEDTLS_ERR_SSL_WANT_WRITE) return;
      if (result || mbedtls_ssl_get_verify_result(&ssl_)) { Fail("tls", result ? result : MBEDTLS_ERR_X509_CERT_VERIFY_FAILED); return; }
      tls_state_ = 1;
    }
    if (tls_state_ == 1) {
      if (written_ == request_.size()) { tls_state_ = 2; continue; }
      result = mbedtls_ssl_write(&ssl_, reinterpret_cast<const unsigned char*>(request_.data() + written_), request_.size() - written_);
      if (result == MBEDTLS_ERR_SSL_WANT_READ || result == MBEDTLS_ERR_SSL_WANT_WRITE) return;
      if (result <= 0) { Fail("write", result); return; }
      written_ += result; continue;
    }
    result = mbedtls_ssl_read(&ssl_, plain_, sizeof(plain_));
    if (result == MBEDTLS_ERR_SSL_WANT_READ || result == MBEDTLS_ERR_SSL_WANT_WRITE) return;
    if (!result || result == MBEDTLS_ERR_SSL_PEER_CLOSE_NOTIFY) { Finish(); return; }
    if (result < 0) { Fail("read", result); return; }
    if (raw_.size() + result > film_http::kBodyLimit + 65536) { Fail("size", PP_ERROR_NOMEMORY); return; }
    raw_.append(reinterpret_cast<const char*>(plain_), result);
  }
}
void Job::Timeout(int32_t) { Fail("timeout", PP_ERROR_TIMEDOUT); }
void Job::Fail(const std::string& stage, int32_t code) { owner_->Reply(id_, stage, code, NULL); }
void Job::Finish() { film_http::Response response = film_http::Parse(raw_); owner_->Reply(id_, response.error.empty() ? "http" : "parse", response.error.empty() ? 0 : -1, &response); }
class Module : public pp::Module { public: pp::Instance* CreateInstance(PP_Instance id) { return new Instance(id); } };
}  // namespace
namespace pp { Module* CreateModule() { return new ::Module(); } }

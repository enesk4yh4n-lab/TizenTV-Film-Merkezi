// Modern TV HTTPS worker. Signed origin checks stay inside the compiled module.
// Uses the same CA, policy and HTTP framing sources as the legacy Pepper helper.
#include <sys/socket.h>
#include <netdb.h>
#include <netinet/in.h>
#include <poll.h>
#include <unistd.h>
#include <errno.h>
#include <cstdio>
#include <cstring>
#include <sys/time.h>
#include <emscripten.h>
#include "mbedtls/ssl.h"
#include "mbedtls/x509_crt.h"
#include "mbedtls/platform_util.h"
#include "ca-bundle.h"
#include "http-completion.h"
#include "repository-policy.h"
#include "repository-discovery.h"
extern "C" mbedtls_ms_time_t mbedtls_ms_time(void) {
 struct timeval v;if(gettimeofday(&v,NULL))return 0;
 return static_cast<mbedtls_ms_time_t>(v.tv_sec)*1000+v.tv_usec/1000;
}
namespace {
std::set<std::string> origins;
film_repositories::Registry repositories;
bool configured=false;
bool url(const std::string& text,std::string* host,std::string* target){
 if(text.size()>4096||text.compare(0,8,"https://")||text.find_first_of("\r\n\t #\\")!=std::string::npos||text.find('\0')!=std::string::npos)return false;
 size_t at=text.find('/',8);if(at==std::string::npos)return false;
 *host=text.substr(8,at-8);*target=text.substr(at);return film_policy::Host(*host);
}
bool permitted(const std::string& host,const std::string& target){
 const std::string update="/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/github-eklenti/";
 bool core=host=="raw.githubusercontent.com"&&target.compare(0,update.size(),update)==0&&target.find("..") ==std::string::npos&&target.find_first_of("%\\")==std::string::npos;
 return core||film_discovery::Allowed(host,target)||film_policy::Allowed(host,origins)||repositories.Allowed(host)||repositories.Request(host,target);
}
bool header(const std::string& value){return value.size()<=2048&&value.find_first_of("\r\n") ==std::string::npos&&value.find('\0')==std::string::npos;}
void reply(int id,const std::string& stage,int code,const film_http::Response* r,bool binary,size_t limit){
 const std::string empty;
 const std::string& body=r?r->body:empty;
 EM_ASM({Module.fmReply($0,UTF8ToString($1),$2,$3,$4,$5,UTF8ToString($6),UTF8ToString($7),UTF8ToString($8),$9,$10);},id,stage.c_str(),code,r?r->status:0,body.data(),body.size(),r?r->location.c_str():"",r?r->mimeType.c_str():"",r?r->contentRange.c_str():"",binary?1:0,limit);
}
int random_bytes(void*,unsigned char* data,size_t size){
 return EM_ASM_INT({try{crypto.getRandomValues(HEAPU8.subarray($0,$0+$1));return 0;}catch(e){return -1;}},data,size);
}
int send_bytes(void* p,const unsigned char* data,size_t size){int n=send(*static_cast<int*>(p),data,size,0);return n>=0?n:(errno==EAGAIN||errno==EWOULDBLOCK)?MBEDTLS_ERR_SSL_WANT_WRITE:MBEDTLS_ERR_SSL_INTERNAL_ERROR;}
int recv_bytes(void* p,unsigned char* data,size_t size){int n=recv(*static_cast<int*>(p),data,size,0);return n>=0?n:(errno==EAGAIN||errno==EWOULDBLOCK)?MBEDTLS_ERR_SSL_WANT_READ:MBEDTLS_ERR_SSL_INTERNAL_ERROR;}
bool wait_io(int fd,int code,mbedtls_ms_time_t until){
 const mbedtls_ms_time_t left=until-mbedtls_ms_time();if(left<=0)return false;
 struct pollfd p;p.fd=fd;p.events=code==MBEDTLS_ERR_SSL_WANT_WRITE?POLLOUT:POLLIN;p.revents=0;
 return poll(&p,1,static_cast<int>(std::min(static_cast<mbedtls_ms_time_t>(100),left)))>=0;
}
struct Connection {
 int fd;addrinfo* addresses;mbedtls_ssl_context ssl;mbedtls_ssl_config cfg;mbedtls_x509_crt ca;
 Connection():fd(-1),addresses(NULL){mbedtls_ssl_init(&ssl);mbedtls_ssl_config_init(&cfg);mbedtls_x509_crt_init(&ca);}
 ~Connection(){if(addresses)freeaddrinfo(addresses);if(fd>=0)close(fd);mbedtls_ssl_free(&ssl);mbedtls_ssl_config_free(&cfg);mbedtls_x509_crt_free(&ca);}
};
}
extern "C" {
EMSCRIPTEN_KEEPALIVE int fm_max_origins() { return film_repositories::kMaxOrigins; }
EMSCRIPTEN_KEEPALIVE int fm_configure(const char* text,const char* signature){
 if(configured||!text||!signature||!film_policy::Verify(text,signature,&origins))return -1;
 configured=true;return 0;
}
EMSCRIPTEN_KEEPALIVE int fm_repository(const char* id,const char* index,const char* key){return id&&index&&key&&repositories.Register(id,index,key)?0:-1;}
EMSCRIPTEN_KEEPALIVE int fm_policy(const char* id,const char* plugin,const char* text,const char* signature){return id&&plugin&&text&&signature&&repositories.Policy(id,plugin,text,signature,origins)?0:-1;}
EMSCRIPTEN_KEEPALIVE int fm_remove(const char* id){if(!id)return -1;repositories.Remove(id);return 0;}
EMSCRIPTEN_KEEPALIVE void fm_request(int id,const char* u,const char* ref,const char* rid,const char* pid,const char* verb,const char* payload,const char* range,const char* origin,const char* mime,const char* requested,const char* agent,int binary,int byte_limit,int milliseconds){
 std::string host,target,rhost,rtarget,method=verb?verb:"GET",body=payload?payload:"",referer=ref?ref:"",repo=rid?rid:"",plugin=pid?pid:"";
 const bool scoped=!repo.empty()||!plugin.empty();
 if(id<=0||!u||!url(u,&host,&target)||!permitted(host,target)||(scoped&&!repositories.Scoped(repo,plugin,host))||byte_limit<1||static_cast<size_t>(byte_limit)>(binary?film_http::kBinaryBodyLimit:film_http::kBodyLimit)||milliseconds<1||milliseconds>30000||(method!="GET"&&method!="POST")||body.size()>262144||(method=="GET"&&!body.empty())){reply(id,"validation",-1,NULL,binary,byte_limit);return;}
 if(!referer.empty()&&(!url(referer,&rhost,&rtarget)||!permitted(rhost,rtarget)||(scoped&&!repositories.Scoped(repo,plugin,rhost)))){reply(id,"validation",-1,NULL,binary,byte_limit);return;}
 if(film_discovery::Allowed(host,target)&&(method!="GET"||binary||byte_limit>262144)){reply(id,"validation",-1,NULL,binary,byte_limit);return;}
 if(agent&&!header(agent)){reply(id,"validation",-1,NULL,binary,byte_limit);return;}
 std::string extra;const char* values[]={range,origin,mime,requested};const char* names[]={"Range","Origin","Content-Type","X-Requested-With"};
 for(int i=0;i<4;i++)if(values[i]&&values[i][0]){
  std::string value=values[i];if(!header(value)){reply(id,"validation",-1,NULL,binary,byte_limit);return;}
  if(i==1){std::string h;if(!film_policy::Origin(value,&h)||(!film_policy::Allowed(h,origins)&&!repositories.Allowed(h))||(scoped&&!repositories.Scoped(repo,plugin,h))){reply(id,"validation",-1,NULL,binary,byte_limit);return;}}
  extra+=std::string(names[i])+": "+value+"\r\n";
 }
 const mbedtls_ms_time_t until=mbedtls_ms_time()+milliseconds;
 Connection c;int code=0;std::string stage="dns",raw;film_http_completion::Completion completion(byte_limit);
 do {
  struct addrinfo hint;std::memset(&hint,0,sizeof(hint));hint.ai_family=AF_INET;hint.ai_socktype=SOCK_STREAM;
  code=getaddrinfo(host.c_str(),"443",&hint,&c.addresses);if(code||!c.addresses){code=code?code:-1;break;}
  sockaddr_in* address=reinterpret_cast<sockaddr_in*>(c.addresses->ai_addr);
  if(c.addresses->ai_family!=AF_INET||!film_policy::PublicIPv4(reinterpret_cast<unsigned char*>(&address->sin_addr.s_addr))){stage="validation";code=-1;break;}
  stage="connect";c.fd=socket(AF_INET,SOCK_STREAM|SOCK_NONBLOCK,0);if(c.fd<0){code=-1;break;}
  if(connect(c.fd,c.addresses->ai_addr,c.addresses->ai_addrlen)<0&&errno!=EINPROGRESS){code=-errno;break;}
  stage="ca";code=mbedtls_x509_crt_parse(&c.ca,kCaBundle,sizeof(kCaBundle));if(code)break;
  code=mbedtls_ssl_config_defaults(&c.cfg,MBEDTLS_SSL_IS_CLIENT,MBEDTLS_SSL_TRANSPORT_STREAM,MBEDTLS_SSL_PRESET_DEFAULT);if(code)break;
  mbedtls_ssl_conf_authmode(&c.cfg,MBEDTLS_SSL_VERIFY_REQUIRED);mbedtls_ssl_conf_ca_chain(&c.cfg,&c.ca,NULL);mbedtls_ssl_conf_rng(&c.cfg,random_bytes,NULL);
  code=mbedtls_ssl_setup(&c.ssl,&c.cfg);if(code)break;code=mbedtls_ssl_set_hostname(&c.ssl,host.c_str());if(code)break;
  mbedtls_ssl_set_bio(&c.ssl,&c.fd,send_bytes,recv_bytes,NULL);stage="tls";
  while((code=mbedtls_ssl_handshake(&c.ssl))==MBEDTLS_ERR_SSL_WANT_READ||code==MBEDTLS_ERR_SSL_WANT_WRITE){if(!wait_io(c.fd,code,until)){stage="timeout";code=-7;break;}}
  if(code||mbedtls_ssl_get_verify_result(&c.ssl)){if(!code)code=-1;break;}
  std::string request=method+" "+target+" HTTP/1.1\r\nHost: "+host+"\r\nUser-Agent: "+(agent&&agent[0]?agent:"Mozilla/5.0")+"\r\nAccept: */*\r\nAccept-Encoding: identity\r\nConnection: close\r\n";
  if(!referer.empty())request+="Referer: "+referer+"\r\n";request+=extra;
  if(method=="POST"){char n[32];std::sprintf(n,"%u",static_cast<unsigned>(body.size()));request+="Content-Length: "+std::string(n)+"\r\n";}
  request+="\r\n"+body;stage="write";size_t written=0;
  while(written<request.size()){
   code=mbedtls_ssl_write(&c.ssl,reinterpret_cast<const unsigned char*>(request.data()+written),request.size()-written);
   if(code==MBEDTLS_ERR_SSL_WANT_READ||code==MBEDTLS_ERR_SSL_WANT_WRITE){if(!wait_io(c.fd,code,until)){stage="timeout";code=-7;break;}continue;}
   if(code<=0)break;written+=code;
  }
  if(written!=request.size())break;stage="read";unsigned char data[16384];size_t progress=0;
  for(;;){
   if(mbedtls_ms_time()>=until){stage="timeout";code=-7;break;}
   code=mbedtls_ssl_read(&c.ssl,data,sizeof(data));
   if(code==MBEDTLS_ERR_SSL_WANT_READ||code==MBEDTLS_ERR_SSL_WANT_WRITE){if(!wait_io(c.fd,code,until)){stage="timeout";code=-7;break;}continue;}
   bool eof=code==0||code==MBEDTLS_ERR_SSL_PEER_CLOSE_NOTIFY;if(code<0&&!eof)break;
   if(code>0){
    if(raw.size()+code>static_cast<size_t>(byte_limit)+film_http::kWireOverheadLimit){stage="size";code=-8;break;}
    film_http::AppendWire(raw,reinterpret_cast<const char*>(data),code,byte_limit);
   }
   film_http_completion::Completion::State state=completion.Inspect(raw,eof);
   if(state==film_http_completion::Completion::invalid){stage=completion.tooLarge()?"size":"parse";code=completion.tooLarge()?-8:-1;break;}
   if(state==film_http_completion::Completion::complete){film_http::Response r;completion.ParseComplete(&raw,r);reply(id,r.error.empty()?"http":"parse",r.error.empty()?0:-1,&r,binary,byte_limit);return;}
   size_t split=raw.find("\r\n\r\n");if(split!=std::string::npos){size_t loaded=raw.size()-split-4;if(loaded&&(!progress||loaded-progress>=131072)){progress=loaded;EM_ASM({postMessage({kind:'progress',id:$0,loaded:$1});},id,loaded);}}
  }
 }while(false);
 reply(id,stage,code?code:-1,NULL,binary,byte_limit);
}
}
int main(){return 0;}

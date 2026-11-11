// User-approved repositories have independent public keys and signed network policies.
#ifndef FILM_REPOSITORY_POLICY_H
#define FILM_REPOSITORY_POLICY_H
#include "network-policy.h"
#include <map>
#include <vector>
namespace film_repositories {
inline bool Id(const std::string& s) { return !s.empty()&&s.size()<=64&&s[0]>='a'&&s[0]<='z'&&s.find_first_not_of("abcdefghijklmnopqrstuvwxyz0123456789-")==std::string::npos; }
inline bool Clean(const std::string& s) { return s.find("..") == std::string::npos && s.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./-")==std::string::npos; }
struct Entry { std::string host,root,key;std::map<std::string,std::set<std::string> > policies; };
class Registry {
 public:
 bool Register(const std::string& id,const std::string& index,const std::string& encoded) {
  if(!Id(id)||index.size()>2048||index.compare(0,8,"https://"))return false;size_t slash=index.find('/',8);if(slash==std::string::npos)return false;std::string host=index.substr(8,slash-8),target=index.substr(slash),name="/filmmerkezi-repository.json";
  if(!film_policy::Host(host)||!Clean(target)||target.size()<name.size()||target.compare(target.size()-name.size(),name.size(),name))return false;
  std::string key;if(!encoded.empty()){unsigned char bytes[512];size_t length=0;if(encoded.size()>800||mbedtls_base64_decode(bytes,sizeof(bytes),&length,reinterpret_cast<const unsigned char*>(encoded.data()),encoded.size()))return false;mbedtls_pk_context pk;mbedtls_pk_init(&pk);int rc=mbedtls_pk_parse_public_key(&pk,bytes,length);bool valid=!rc&&mbedtls_pk_can_do(&pk,MBEDTLS_PK_RSA)&&mbedtls_pk_get_bitlen(&pk)==2048;mbedtls_pk_free(&pk);if(!valid)return false;key.assign(reinterpret_cast<const char*>(bytes),length);}
  if(entries_.count(id)&&!entries_[id].key.empty()&&entries_[id].key!=key)return false;if(!entries_.count(id)&&entries_.size()>=32)return false;
  Entry& r=entries_[id];r.host=host;r.root=target.substr(0,target.size()-name.size()+1);r.key=key;return true;
 }
 bool Request(const std::string& host,const std::string& target) const {
  const std::string path=target.substr(0,target.find('?'));if(!Clean(path))return false;
  for(std::map<std::string,Entry>::const_iterator i=entries_.begin();i!=entries_.end();++i){const Entry& e=i->second;if(e.host!=host||path.compare(0,e.root.size(),e.root))continue;if(!e.key.empty()||path==e.root+"filmmerkezi-repository.json"||path==e.root+"filmmerkezi-repository.sig")return true;}return false;
 }
 bool Allowed(const std::string& host) const { for(std::map<std::string,Entry>::const_iterator i=entries_.begin();i!=entries_.end();++i)for(std::map<std::string,std::set<std::string> >::const_iterator p=i->second.policies.begin();p!=i->second.policies.end();++p)if(film_policy::Allowed(host,p->second))return true;return false; }
 bool Scoped(const std::string& repository,const std::string& plugin,const std::string& host) const {
  std::map<std::string,Entry>::const_iterator r=entries_.find(repository);if(r==entries_.end())return false;
  std::map<std::string,std::set<std::string> >::const_iterator p=r->second.policies.find(plugin);
  return p!=r->second.policies.end()&&film_policy::Allowed(host,p->second);
 }
 bool Policy(const std::string& id,const std::string& plugin,const std::string& text,const std::string& signature,const std::set<std::string>& base) {
  if(!Id(plugin)||!entries_.count(id)||entries_[id].key.empty())return false;Entry& e=entries_[id];if(e.policies.size()>=64&&!e.policies.count(plugin))return false;std::set<std::string> origins;
  if(!film_policy::VerifyWithKey(text,signature,reinterpret_cast<const unsigned char*>(e.key.data()),e.key.size(),&origins))return false;
  std::set<std::string> all=base;for(std::map<std::string,Entry>::const_iterator r=entries_.begin();r!=entries_.end();++r)for(std::map<std::string,std::set<std::string> >::const_iterator p=r->second.policies.begin();p!=r->second.policies.end();++p)if(r->first!=id||p->first!=plugin)all.insert(p->second.begin(),p->second.end());all.insert(origins.begin(),origins.end());if(all.size()>128)return false;e.policies[plugin]=origins;return true;
 }
 void Remove(const std::string& id) { entries_.erase(id); }
 private: std::map<std::string,Entry> entries_;
};
}
#endif

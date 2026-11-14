// Public GitHub discovery only. No tokens, write endpoints or general API access.
#ifndef FILM_REPOSITORY_DISCOVERY_H
#define FILM_REPOSITORY_DISCOVERY_H
#include <string>
namespace film_discovery {
inline bool Part(const std::string& s) { return !s.empty() && s.size()<=100 && s!="." && s!=".." && s.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-")==std::string::npos; }
inline bool Allowed(const std::string& host,const std::string& target) {
 if(host!="api.github.com" || target.size()>2048) return false;
 const std::string path=target.substr(0,target.find('?'));
 if(path=="/search/repositories") return target.find("filmmerkezi201-repository.json")!=std::string::npos;
 if(path.compare(0,7,"/repos/")) return false;
 const size_t ownerEnd=path.find('/',7); if(ownerEnd==std::string::npos) return false;
 const size_t repoEnd=path.find('/',ownerEnd+1); if(repoEnd==std::string::npos) return false;
 return Part(path.substr(7,ownerEnd-7)) && Part(path.substr(ownerEnd+1,repoEnd-ownerEnd-1)) && path.substr(repoEnd)=="/readme";
}
}
#endif

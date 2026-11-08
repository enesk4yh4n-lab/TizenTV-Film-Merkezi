// Native policy is separately RSA-signed and also hashed by the component manifest.
#ifndef FILM_NETWORK_POLICY_H
#define FILM_NETWORK_POLICY_H
#include <string>
#include <set>
#include <cstdlib>
#include "mbedtls/pk.h"
#include "mbedtls/base64.h"
#include "mbedtls/sha256.h"
#include "update-public-key.h"
namespace film_policy {
inline bool Host(const std::string& h) {
 if(h.empty()||h.size()>253||h.find('.')==std::string::npos||h.find_first_not_of("abcdefghijklmnopqrstuvwxyz0123456789.-")!=std::string::npos||h.find_first_not_of("0123456789.")==std::string::npos)return false;
 if(h=="localhost"||h.compare(h.size()>6?h.size()-6:0,6,".local")==0||h.compare(h.size()>10?h.size()-10:0,10,".localhost")==0)return false;
 size_t at=0;while(at<h.size()){size_t end=h.find('.',at);if(end==std::string::npos)end=h.size();if(end==at||end-at>63||h[at]=='-'||h[end-1]=='-')return false;at=end+1;}return h[h.size()-1]!='.';
}
// Signed DNS patterns: at most one {n}, matching 1..6 decimal digits.
// Included into the generated policy header after the normal Host validator.
inline bool PatternSample(const std::string& host,std::string* sample) {
 size_t n=host.find("{n}");*sample=host;
 if(n!=std::string::npos){if(host.find("{n}",n+3)!=std::string::npos||host.rfind('.')==std::string::npos||n>=host.rfind('.'))return false;sample->replace(n,3,"000000");}
 return Host(*sample);
}
inline bool PatternExact(const std::string& host,const std::string& pattern) {
 size_t n=pattern.find("{n}");if(n==std::string::npos)return host==pattern;
 std::string suffix=pattern.substr(n+3);if(host.size()<n+suffix.size()+1||host.size()>n+suffix.size()+6||host.compare(0,n,pattern,0,n)||host.compare(host.size()-suffix.size(),suffix.size(),suffix))return false;
 return host.substr(n,host.size()-n-suffix.size()).find_first_not_of("0123456789")==std::string::npos;
}
inline bool Origin(const std::string& o,std::string* h) {
 if(o.compare(0,8,"https://"))return false;*h=o.substr(8);if(h->compare(0,2,"*.")==0)*h=h->substr(2);std::string sample;return PatternSample(*h,&sample);
}
inline bool Allowed(const std::string& host,const std::set<std::string>& origins) {
 if(!Host(host))return false;
 for(std::set<std::string>::const_iterator i=origins.begin();i!=origins.end();++i){bool wildcard=i->compare(0,10,"https://*.")==0;std::string pattern=i->substr(wildcard?10:8);if(!wildcard){if(PatternExact(host,pattern))return true;}else{for(size_t at=host.find('.');at!=std::string::npos;at=host.find('.',at+1))if(PatternExact(host.substr(at+1),pattern))return true;}}
 return false;
}

inline bool PublicIPv4(const unsigned char* ip){return ip[0]!=0&&ip[0]!=10&&ip[0]!=127&&ip[0]<224&&!(ip[0]==169&&ip[1]==254)&&!(ip[0]==172&&ip[1]>=16&&ip[1]<=31)&&!(ip[0]==192&&ip[1]==168)&&!(ip[0]==100&&ip[1]>=64&&ip[1]<=127)&&!(ip[0]==198&&(ip[1]==18||ip[1]==19));}
inline bool VerifyWithKey(const std::string& text,const std::string& signature,const unsigned char* key,size_t keySize,std::set<std::string>* result){
 if(text.size()>16384||signature.size()>1024)return false;unsigned char digest[32],sig[512];size_t length=0;mbedtls_pk_context pk;mbedtls_pk_init(&pk);
 int rc=mbedtls_pk_parse_public_key(&pk,key,keySize);if(!rc&&(!mbedtls_pk_can_do(&pk,MBEDTLS_PK_RSA)||mbedtls_pk_get_bitlen(&pk)!=2048))rc=-1;if(!rc)rc=mbedtls_sha256(reinterpret_cast<const unsigned char*>(text.data()),text.size(),digest,0);if(!rc)rc=mbedtls_base64_decode(sig,sizeof(sig),&length,reinterpret_cast<const unsigned char*>(signature.data()),signature.size());if(!rc)rc=mbedtls_pk_verify(&pk,MBEDTLS_MD_SHA256,digest,sizeof(digest),sig,length);mbedtls_pk_free(&pk);if(rc)return false;
 const std::string prefix="FILM-MERKEZI-ORIGINS-1\n";if(text.compare(0,prefix.size(),prefix)||text.empty()||text[text.size()-1]!='\n')return false;std::set<std::string> parsed;size_t at=prefix.size();while(at<text.size()){size_t end=text.find('\n',at);if(end==std::string::npos)return false;std::string origin=text.substr(at,end-at),host;if(!Origin(origin,&host)||!parsed.insert(origin).second||parsed.size()>128)return false;at=end+1;}if(parsed.empty())return false;result->swap(parsed);return true;
}
inline bool Verify(const std::string& text,const std::string& signature,std::set<std::string>* result){return VerifyWithKey(text,signature,kUpdatePublicKey,sizeof(kUpdatePublicKey),result);}
}
#endif

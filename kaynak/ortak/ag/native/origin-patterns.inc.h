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

#ifndef FILM_REPOSITORY_CAPACITY_H
#define FILM_REPOSITORY_CAPACITY_H
namespace film_repositories {
// Resource ceiling only. Signed per-package scopes are still checked on every request.
static const unsigned kMaxOrigins = 2048;
static const unsigned kMaxPackages = 512;
}
#endif

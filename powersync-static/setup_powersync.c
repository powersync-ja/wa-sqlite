#include <sqlite3.h>

extern int sqlite3_powersync_init(sqlite3 *db, char **pzErrMsg,
                                  const sqlite3_api_routines *pApi);

int setup_powersync()
{
  return sqlite3_auto_extension((void (*)(void)) & sqlite3_powersync_init);
}

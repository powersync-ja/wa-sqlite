# dependencies

BASE_SQLITE_VERSION=3.50.1
SQLITE_VERSION = version-${BASE_SQLITE_VERSION}
MC_SQLITE_VERSION = 2.1.3
SQLITE_TARBALL_URL = https://www.sqlite.org/src/tarball/$(SQLITE_VERSION)/sqlite.tar.gz
MC_SQLITE_URL = https://github.com/utelle/SQLite3MultipleCiphers/releases/download/v${MC_SQLITE_VERSION}/sqlite3mc-${MC_SQLITE_VERSION}-sqlite-${BASE_SQLITE_VERSION}-amalgamation.zip

EXTENSION_FUNCTIONS = extension-functions.c
EXTENSION_FUNCTIONS_URL = https://www.sqlite.org/contrib/download/extension-functions.c?get=25
EXTENSION_FUNCTIONS_SHA3 = ee39ddf5eaa21e1d0ebcbceeab42822dd0c4f82d8039ce173fd4814807faabfa

# WA-SQLite source files
CFILES = \
	sqlite3.c \
	extension-functions.c \
	main.c \
	libauthorizer.c \
	libfunction.c \
	libhook.c \
	libprogress.c \
	libvfs.c \
	$(CFILES_EXTRA)


POWERSYNC_CFILES = $(notdir $(wildcard powersync-static/*.c))

MC_CFILES = \
	sqlite3mc_amalgamation.c \
	extension-functions.c \
	main.c \
	libauthorizer.c \
	libfunction.c \
	libhook.c \
	libprogress.c \
	libvfs.c \
	$(CFILES_EXTRA)

JSFILES = \
	src/libauthorizer.js \
	src/libfunction.js \
	src/libhook.js \
	src/libprogress.js \
	src/libvfs.js

vpath %.c src
vpath %.c deps
vpath %.c deps/$(SQLITE_VERSION)
vpath %.c powersync-static

POWERSYNC_EXPORTED_FUNCTIONS = powersync-static/powersync_exported_functions.json
EXPORTED_FUNCTIONS = src/exported_functions.json
MC_EXPORTED_FUNCTIONS = multiple-ciphers/mc_exported_functions.json

# EMCC does not support multiple exports files. Need to combine them temporarily
COMBINED_EXPORTED_FUNCTIONS = tmp/combined_exports.json
MC_COMBINED_EXPORTED_FUNCTIONS = tmp/mc_combined_exports.json

EXPORTED_RUNTIME_METHODS = src/extra_exported_runtime_methods.json
ASYNCIFY_IMPORTS = src/asyncify_imports.json
JSPI_EXPORTS = src/jspi_exports.json

# intermediate files
OBJ_FILES_DEBUG = $(patsubst %.c,tmp/obj/debug/%.o,$(CFILES))
OBJ_FILES_DIST = $(patsubst %.c,tmp/obj/dist/%.o,$(CFILES))

POWERSYNC_OBJ_FILES_DEBUG = $(patsubst %.c,tmp/powersync-obj/debug/%.o,$(POWERSYNC_CFILES))
POWERSYNC_OBJ_FILES_DIST = $(patsubst %.c,tmp/powersync-obj/dist/%.o,$(POWERSYNC_CFILES))
POWERSYNC_STATIC_FILES = powersync-libs/libpowersync-wasm.a

MC_OBJ_FILES_DEBUG = $(patsubst %.c,tmp/mc-obj/debug/%.o,$(MC_CFILES))
MC_OBJ_FILES_DIST = $(patsubst %.c,tmp/mc-obj/dist/%.o,$(MC_CFILES))

# build options
EMCC ?= emcc

CFLAGS_COMMON = \
	-I'deps/$(SQLITE_VERSION)' \
	-Wno-non-literal-null-conversion \
	$(CFLAGS_EXTRA)
CFLAGS_DEBUG = -g -fPIC $(CFLAGS_COMMON)
CFLAGS_DIST =  -Oz -flto $(CFLAGS_COMMON)

EMFLAGS_COMMON = \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s WASM=1 \
	-s INVOKE_RUN \
	-s ENVIRONMENT="web,worker" \
	-s STACK_SIZE=512KB \
	-s WASM_BIGINT=0 \
	$(EMFLAGS_EXTRA)

EMFLAGS_DEBUG = \
	-s ASSERTIONS=1 \
	-g -Oz -Oz \
	$(EMFLAGS_COMMON)

EMFLAGS_DIST = \
	-Oz \
	-flto \
	$(EMFLAGS_COMMON)

# Need to export all the Main module's symbols
# Setting MAIN_MODULE=2 can cause a runtime error if the 
# main module does not export a particular function.
# With this being a runtime error, it's tricky to determine all
# the methods that a submodule might require - also for this to have value
# other submodules would need to be compatible, but we cannot gaurentee their
# required exports are present. 
# This setting increases the main WASM side considerably.
# Rougly increases from 1.5mb to 3.7mb.
EMFLAGS_DYNAMIC = \
	-s MAIN_MODULE=1 

EMFLAGS_INTERFACES = \
	-s EXPORTED_FUNCTIONS=@$(EXPORTED_FUNCTIONS) \
	-s EXPORTED_RUNTIME_METHODS=@$(EXPORTED_RUNTIME_METHODS)

COMBINED_EMFLAGS_INTERFACES = \
	-s EXPORTED_FUNCTIONS=@$(COMBINED_EXPORTED_FUNCTIONS) \
	-s EXPORTED_RUNTIME_METHODS=@$(EXPORTED_RUNTIME_METHODS)

MC_COMBINED_EMFLAGS_INTERFACES = \
	-s EXPORTED_FUNCTIONS=@$(MC_COMBINED_EXPORTED_FUNCTIONS) \
	-s EXPORTED_RUNTIME_METHODS=@$(EXPORTED_RUNTIME_METHODS)

EMFLAGS_LIBRARIES = \
	--js-library src/libadapters.js \
	--post-js src/libauthorizer.js \
	--post-js src/libfunction.js \
	--post-js src/libhook.js \
	--post-js src/libprogress.js \
	--post-js src/libvfs.js

EMFLAGS_ASYNCIFY_COMMON = \
	-s ASYNCIFY \
	-s ASYNCIFY_IMPORTS=@src/asyncify_imports.json

EMFLAGS_ASYNCIFY_DEBUG = \
	$(EMFLAGS_ASYNCIFY_COMMON) \
	-s ASYNCIFY_STACK_SIZE=24576

EMFLAGS_ASYNCIFY_DIST = \
	$(EMFLAGS_ASYNCIFY_COMMON) \
	-s ASYNCIFY_STACK_SIZE=16384

EMFLAGS_JSPI = \
	-s JSPI \
	-s ASYNCIFY_IMPORTS=@src/asyncify_imports.json \
	-s JSPI_EXPORTS=@src/jspi_exports.json

# https://www.sqlite.org/compile.html
WASQLITE_DEFINES = \
	-DSQLITE_DEFAULT_MEMSTATUS=0 \
	-DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1 \
	-DSQLITE_DQS=0 \
	-D__WASM__ \
	-DSQLITE_LIKE_DOESNT_MATCH_BLOBS \
	-DSQLITE_MAX_EXPR_DEPTH=0 \
	-DSQLITE_OMIT_AUTOINIT \
	-DSQLITE_OMIT_DECLTYPE \
	-DSQLITE_OMIT_DEPRECATED \
	-DSQLITE_OMIT_SHARED_CACHE \
	-DSQLITE_THREADSAFE=0 \
	-DSQLITE_USE_ALLOCA \
	-DSQLITE_ENABLE_BATCH_ATOMIC_WRITE \
	-DSQLITE_ENABLE_FTS5 \
	$(WASQLITE_EXTRA_DEFINES)

# directories
.PHONY: all
all: dist

.PHONY: clean
clean:
	rm -rf dist debug tmp

.PHONY: spotless
spotless:
	rm -rf dist debug tmp deps cache

## cache
.PHONY: clean-cache
clean-cache:
	rm -rf cache

cache/$(EXTENSION_FUNCTIONS):
	mkdir -p cache
	curl -LsSf '$(EXTENSION_FUNCTIONS_URL)' -o $@

## deps
.PHONY: clean-deps
clean-deps:
	rm -rf deps

# Combine WA-SQLite and PowerSync exported functions
$(COMBINED_EXPORTED_FUNCTIONS): $(EXPORTED_FUNCTIONS) $(POWERSYNC_EXPORTED_FUNCTIONS)
	jq -s 'add' $(EXPORTED_FUNCTIONS) $(POWERSYNC_EXPORTED_FUNCTIONS) > $(COMBINED_EXPORTED_FUNCTIONS)

$(MC_COMBINED_EXPORTED_FUNCTIONS): $(EXPORTED_FUNCTIONS) $(POWERSYNC_EXPORTED_FUNCTIONS) $(MC_EXPORTED_FUNCTIONS)
	jq -s 'add' $(EXPORTED_FUNCTIONS) $(POWERSYNC_EXPORTED_FUNCTIONS) $(MC_EXPORTED_FUNCTIONS) > $(MC_COMBINED_EXPORTED_FUNCTIONS)

deps/$(SQLITE_VERSION)/sqlite3.h deps/$(SQLITE_VERSION)/sqlite3.c:
	mkdir -p cache/$(SQLITE_VERSION)
	curl -LsS $(SQLITE_TARBALL_URL) | tar -xzf - -C cache/$(SQLITE_VERSION)/ --strip-components=1
	mkdir -p deps/$(SQLITE_VERSION)
	(cd deps/$(SQLITE_VERSION); ../../cache/$(SQLITE_VERSION)/configure --enable-all && make sqlite3.c)

# Download and extract sqlite3mc_amalgamation.c to the deps directory
deps/$(SQLITE_VERSION)/sqlite3mc_amalgamation.c:
	mkdir -p cache/sqlite3mc-$(MC_SQLITE_VERSION)
	curl -LsS $(MC_SQLITE_URL) -o cache/sqlite3mc-$(MC_SQLITE_VERSION)/sqlite3mc.zip
	unzip -o cache/sqlite3mc-$(MC_SQLITE_VERSION)/sqlite3mc.zip -d cache/sqlite3mc-$(MC_SQLITE_VERSION)
	rm -rf cache/sqlite3mc-$(MC_SQLITE_VERSION)/sqlite3mc.zip
	cp cache/sqlite3mc-$(MC_SQLITE_VERSION)/sqlite3mc_amalgamation.c deps/$(SQLITE_VERSION)/sqlite3mc_amalgamation.c

# Download static files from PowerSync Core repository
$(POWERSYNC_STATIC_FILES): powersync-version scripts/download-core-build.js
	node scripts/download-core-build.js

ifeq ($(shell uname), Darwin)
    OPENSSL_CHECK_CMD := openssl dgst -sha3-256 -r cache/$(EXTENSION_FUNCTIONS) | sed -e 's/ .*//' > deps/sha3
else
    OPENSSL_CHECK_CMD := openssl dgst -sha3-256 -r cache/$(EXTENSION_FUNCTIONS) | sed -e 's/\s.*//' > deps/sha3
endif

ifeq ($(shell uname), Darwin)
	HASH_CHECK_CMD := echo $(EXTENSION_FUNCTIONS_SHA3) | cmp /dev/stdin deps/sha3
else
	HASH_CHECK_CMD := echo $(EXTENSION_FUNCTIONS_SHA3) | cmp deps/sha3
endif



# This hacks away a:
# ```C
#  #define COMPILE_SQLITE_EXTENSIONS_AS_LOADABLE_MODULE=1
# ```
# statement in `extension-functions.c`. 
# The default setting causes ``extension-functions.c` to import SQLite3 with
# ```C
#  #include "sqlite3ext.h"
# ```
# This results in undefined symbols during runtime when `-DSQLITE_OMIT_LOAD_EXTENSION` is not used.
ifeq ($(shell uname), Darwin)
    SED_INPLACE := sed -i ''
else
    SED_INPLACE := sed -i
endif
deps/$(EXTENSION_FUNCTIONS): cache/$(EXTENSION_FUNCTIONS)
	mkdir -p deps
	bash -c "$(OPENSSL_CHECK_CMD)"
	bash -c "$(HASH_CHECK_CMD)"
	rm -rf deps/sha3 $@
	$(SED_INPLACE) "/#define COMPILE_SQLITE_EXTENSIONS_AS_LOADABLE_MODULE/d" cache/$(EXTENSION_FUNCTIONS)
	cp cache/$(EXTENSION_FUNCTIONS) $@

## tmp
.PHONY: clean-tmp
clean-tmp:
	rm -rf tmp

tmp/obj/debug/%.o: %.c
	mkdir -p tmp/obj/debug
	$(EMCC) $(CFLAGS_DEBUG) $(WASQLITE_DEFINES) $^ -c -o $@

tmp/obj/dist/%.o: %.c
	mkdir -p tmp/obj/dist
	$(EMCC) $(CFLAGS_DIST) $(WASQLITE_DEFINES) $^ -c -o $@

# Build PowerSync specific C files
tmp/powersync-obj/debug/%.o: %.c
	mkdir -p tmp/powersync-obj/debug
	$(EMCC) $(CFLAGS_DEBUG) $(WASQLITE_DEFINES) $^ -c -o $@

# Build PowerSync specific C files
tmp/powersync-obj/dist/%.o: %.c
	mkdir -p tmp/powersync-obj/dist
	$(EMCC) $(CFLAGS_DIST) $(WASQLITE_DEFINES) $^ -c -o $@

# Build multiple ciphers
tmp/mc-obj/debug/%.o: %.c
	mkdir -p tmp/mc-obj/debug
	$(EMCC) $(CFLAGS_DEBUG) $(WASQLITE_DEFINES) $^ -c -o $@

# Build multiple ciphers
tmp/mc-obj/dist/%.o: %.c
	mkdir -p tmp/mc-obj/dist
	$(EMCC) $(CFLAGS_DIST) $(WASQLITE_DEFINES) $^ -c -o $@


## debug
.PHONY: clean-debug
clean-debug:
	rm -rf debug

.PHONY: debug
debug: debug/wa-sqlite.mjs debug/wa-sqlite-async.mjs debug/wa-sqlite-jspi.mjs debug/wa-sqlite-dynamic-main.mjs debug/wa-sqlite-dynamic-main-async.mjs debug/mc-wa-sqlite.mjs debug/mc-wa-sqlite-async.mjs debug/mc-wa-sqlite-jspi.mjs

# Statically links PowerSync Core
debug/wa-sqlite.mjs: $(OBJ_FILES_DEBUG) $(POWERSYNC_OBJ_FILES_DEBUG) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(POWERSYNC_STATIC_FILES) $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(OBJ_FILES_DEBUG) \
	  $(POWERSYNC_OBJ_FILES_DEBUG) -o $@

# Statically links PowerSync Core
debug/wa-sqlite-async.mjs: $(OBJ_FILES_DEBUG) $(POWERSYNC_OBJ_FILES_DEBUG) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DEBUG) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DEBUG) \
	  $(OBJ_FILES_DEBUG) -o $@

# Statically links PowerSync Core
debug/wa-sqlite-jspi.mjs: $(OBJ_FILES_DEBUG) $(POWERSYNC_OBJ_FILES_DEBUG) $(JSFILES) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) $(EMFLAGS_DYNAMIC)  \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_JSPI) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DEBUG) \
	  $(OBJ_FILES_DEBUG) -o $@

# Statically links PowerSync Core
debug/mc-wa-sqlite.mjs: $(MC_OBJ_FILES_DEBUG) $(POWERSYNC_OBJ_FILES_DEBUG) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(POWERSYNC_STATIC_FILES) $(MC_COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(OBJ_FILES_DEBUG) \
	  $(MC_OBJ_FILES_DEBUG) -o $@

# Statically links PowerSync Core
debug/mc-wa-sqlite-async.mjs: $(MC_OBJ_FILES_DEBUG) $(POWERSYNC_OBJ_FILES_DEBUG)  $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(MC_COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DEBUG) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DEBUG) \
	  $(MC_OBJ_FILES_DEBUG) -o $@

# Statically links PowerSync Core
debug/mc-wa-sqlite-jspi.mjs: $(MC_OBJ_FILES_DEBUG) $(POWERSYNC_OBJ_FILES_DEBUG) $(JSFILES) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(MC_COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) $(EMFLAGS_DYNAMIC)  \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_JSPI) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DEBUG) \
	  $(MC_OBJ_FILES_DEBUG) -o $@


# Dynamic main module
# Exported functions are omitted here since everything is currently exported
debug/wa-sqlite-dynamic-main.mjs: $(OBJ_FILES_DEBUG) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS)  $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) $(EMFLAGS_DYNAMIC) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(OBJ_FILES_DEBUG) -o $@

# Dynamic main module
# Exported functions are omitted here since everything is currently exported
debug/wa-sqlite-dynamic-main-async.mjs: $(OBJ_FILES_DEBUG) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)  $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) $(EMFLAGS_DYNAMIC) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DEBUG) \
	  $(OBJ_FILES_DEBUG) -o $@

## Debug FTS builds
# .PHONY: debug
# debug: debug/wa-sqlite.mjs debug/wa-sqlite-async.mjs

# debug/wa-sqlite.mjs: $(OBJ_FILES_DEBUG_FTS) $(RS_DEBUG_BC) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS)
# 	mkdir -p debug
# 	$(EMCC) $(EMFLAGS_DEBUG) \
# 	  $(EMFLAGS_INTERFACES) \
# 	  $(EMFLAGS_LIBRARIES) \
# 		$(RS_WASM_TGT_DIR)/debug/deps/*.bc \
# 	  $(OBJ_FILES_DEBUG_FTS) *.o -o $@

# debug/wa-sqlite-async.mjs: $(OBJ_FILES_DEBUG_FTS) $(RS_DEBUG_BC) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)
# 	mkdir -p debug
# 	$(EMCC) $(EMFLAGS_DEBUG) \
# 	  $(EMFLAGS_INTERFACES) \
# 	  $(EMFLAGS_LIBRARIES) \
# 	  $(EMFLAGS_ASYNCIFY_DEBUG) \
# 		$(RS_WASM_TGT_DIR)/debug/deps/*.bc \
# 	  $(OBJ_FILES_DEBUG_FTS) *.o -o $@


## dist
.PHONY: clean-dist
clean-dist:
	rm -rf dist

.PHONY: dist
dist: dist/wa-sqlite.mjs dist/wa-sqlite-async.mjs dist/wa-sqlite-jspi.mjs dist/wa-sqlite-dynamic-main.mjs dist/wa-sqlite-async-dynamic-main.mjs dist/mc-wa-sqlite.mjs dist/mc-wa-sqlite-async.mjs dist/mc-wa-sqlite-jspi.mjs

# Statically links PowerSync Core
dist/wa-sqlite.mjs: $(OBJ_FILES_DIST) $(POWERSYNC_OBJ_FILES_DIST) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(POWERSYNC_STATIC_FILES) $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DIST) \
	  $(OBJ_FILES_DIST)  -o $@

# Statically links PowerSync Core
dist/wa-sqlite-async.mjs: $(OBJ_FILES_DIST) $(POWERSYNC_OBJ_FILES_DIST) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DIST) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DIST) \
	  $(OBJ_FILES_DIST) -o $@

# Statically links PowerSync Core
dist/wa-sqlite-jspi.mjs: $(OBJ_FILES_DIST) $(POWERSYNC_OBJ_FILES_DIST) $(JSFILES) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_JSPI) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DIST) \
	  $(OBJ_FILES_DIST) -o $@

# Statically links PowerSync Core with multiple ciphers
dist/mc-wa-sqlite.mjs: $(MC_OBJ_FILES_DIST) $(POWERSYNC_OBJ_FILES_DIST) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(POWERSYNC_STATIC_FILES) $(MC_COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(MC_COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DIST) \
	  $(MC_OBJ_FILES_DIST)  -o $@

# Statically links PowerSync Core with multiple ciphers
dist/mc-wa-sqlite-async.mjs: $(MC_OBJ_FILES_DIST) $(POWERSYNC_OBJ_FILES_DIST) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(MC_COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(MC_COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DIST) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DIST) \
	  $(MC_OBJ_FILES_DIST) -o $@

# Statically links PowerSync Core with multiple ciphers
dist/mc-wa-sqlite-jspi.mjs: $(MC_OBJ_FILES_DIST) $(POWERSYNC_OBJ_FILES_DIST) $(JSFILES) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS) $(POWERSYNC_STATIC_FILES) $(MC_COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(MC_COMBINED_EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_JSPI) \
	  $(POWERSYNC_STATIC_FILES) \
	  $(POWERSYNC_OBJ_FILES_DIST) \
	  $(MC_OBJ_FILES_DIST) -o $@

# Dynamic main module
# Exported functions are omitted here since everything is currently exported
dist/wa-sqlite-dynamic-main.mjs: $(OBJ_FILES_DIST) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS)  $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) $(EMFLAGS_DYNAMIC) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(OBJ_FILES_DIST)  -o $@

# Dynamic main module
# Exported functions are omitted here since everything is currently exported
dist/wa-sqlite-async-dynamic-main.mjs: $(OBJ_FILES_DIST) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)  $(COMBINED_EXPORTED_FUNCTIONS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) $(EMFLAGS_DYNAMIC) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DIST) \
	  $(OBJ_FILES_DIST) -o $@


FORCE:

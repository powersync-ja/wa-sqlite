# dependencies
# TODO this should be 3.46.0, but there are build errors
SQLITE_VERSION = version-3.44.0
SQLITE_TARBALL_URL = https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=${SQLITE_VERSION}

EXTENSION_FUNCTIONS = extension-functions.c
EXTENSION_FUNCTIONS_URL = https://www.sqlite.org/contrib/download/extension-functions.c?get=25
EXTENSION_FUNCTIONS_SHA3 = ee39ddf5eaa21e1d0ebcbceeab42822dd0c4f82d8039ce173fd4814807faabfa

# source files
CFILES = \
	sqlite3.c \
	extension-functions.c \
	main.c \
	libauthorizer.c \
	libfunction.c \
	libprogress.c \
	libvfs.c \
	$(CFILES_EXTRA)

JSFILES = \
	src/libauthorizer.js \
	src/libfunction.js \
	src/libprogress.js \
	src/libvfs.js

vpath %.c src
vpath %.c deps
vpath %.c deps/$(SQLITE_VERSION)

EXPORTED_FUNCTIONS = src/exported_functions.json
EXPORTED_RUNTIME_METHODS = src/extra_exported_runtime_methods.json
ASYNCIFY_IMPORTS = src/asyncify_imports.json
ASYNCIFY_EXPORTS = src/asyncify_exports.json

# intermediate files
OBJ_FILES_DEBUG = $(patsubst %.c,tmp/obj/debug/%.o,$(CFILES))
OBJ_FILES_DIST = $(patsubst %.c,tmp/obj/dist/%.o,$(CFILES))

RS_LIB = powersync
RS_LIB_DIR = ./powersync-sqlite-core
RS_WASM_TGT = wasm32-unknown-emscripten
RS_WASM_TGT_DIR = ${RS_LIB_DIR}/target/$(RS_WASM_TGT)
RS_RELEASE_BC = $(RS_WASM_TGT_DIR)/wasm/deps/$(RS_LIB).bc
RS_DEBUG_BC = $(RS_WASM_TGT_DIR)/debug/deps/$(RS_LIB).bc

# build options
EMCC ?= emcc

CFLAGS_COMMON = \
	-I'deps/$(SQLITE_VERSION)' \
	-Wno-non-literal-null-conversion \
	$(CFLAGS_EXTRA)
CFLAGS_DEBUG = -g $(CFLAGS_COMMON)
CFLAGS_DIST =  -Oz -flto $(CFLAGS_COMMON)

EMFLAGS_COMMON = \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s WASM=1 \
	-s INVOKE_RUN \
	-s ENVIRONMENT="web,worker" \
	-s STACK_SIZE=512KB \
	$(EMFLAGS_EXTRA)

EMFLAGS_DEBUG = \
	-s ASSERTIONS=1 \
	-g -Oz -Oz \
	$(EMFLAGS_COMMON)

EMFLAGS_DIST = \
	-Oz \
	-flto \
	$(EMFLAGS_COMMON)

EMFLAGS_INTERFACES = \
	-s EXPORTED_FUNCTIONS=@$(EXPORTED_FUNCTIONS) \
	-s EXPORTED_RUNTIME_METHODS=@$(EXPORTED_RUNTIME_METHODS)

EMFLAGS_LIBRARIES = \
	--js-library src/libadapters.js \
	--js-library src/libtableupdates.js \
	--post-js src/libauthorizer.js \
	--post-js src/libfunction.js \
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
	-s ASYNCIFY=2 \
	-s ASYNCIFY_IMPORTS=@src/asyncify_imports.json \
	-s ASYNCIFY_EXPORTS=@src/asyncify_exports.json

# https://www.sqlite.org/compile.html
WASQLITE_DEFINES = \
	-DSQLITE_DEFAULT_MEMSTATUS=0 \
	-DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1 \
	-DSQLITE_DQS=0 \
	-DSQLITE_LIKE_DOESNT_MATCH_BLOBS \
	-DSQLITE_MAX_EXPR_DEPTH=0 \
	-DSQLITE_OMIT_AUTOINIT \
	-DSQLITE_OMIT_DECLTYPE \
	-DSQLITE_OMIT_DEPRECATED \
	-DSQLITE_OMIT_LOAD_EXTENSION \
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

deps/$(SQLITE_VERSION)/sqlite3.h deps/$(SQLITE_VERSION)/sqlite3.c:
	mkdir -p cache/$(SQLITE_VERSION)
	curl -LsS $(SQLITE_TARBALL_URL) | tar -xzf - -C cache/$(SQLITE_VERSION)/ --strip-components=1
	mkdir -p deps/$(SQLITE_VERSION)
	(cd deps/$(SQLITE_VERSION); ../../cache/$(SQLITE_VERSION)/configure --enable-all && make sqlite3.c)


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


deps/$(EXTENSION_FUNCTIONS): cache/$(EXTENSION_FUNCTIONS)
	mkdir -p deps
	bash -c "$(OPENSSL_CHECK_CMD)"
	bash -c "$(HASH_CHECK_CMD)"
	rm -rf deps/sha3 $@
	cp 'cache/$(EXTENSION_FUNCTIONS)' $@

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

# Use Linker true command switch which differs per OS
ifeq ($(shell uname), Darwin)
    TRUE_CMD := /usr/bin/true
else
    TRUE_CMD := /bin/true
endif

$(RS_DEBUG_BC): FORCE
	mkdir -p tmp/bc/dist
	cd $(RS_LIB_DIR); \
	RUSTFLAGS="--emit=llvm-bc -C linker=${TRUE_CMD}" cargo build -p powersync_loadable --profile wasm --no-default-features --features "powersync_core/static powersync_core/omit_load_extension sqlite_nostd/static sqlite_nostd/omit_load_extension" -Z build-std=panic_abort,core,alloc --target $(RS_WASM_TGT)

$(RS_RELEASE_BC): FORCE
	mkdir -p tmp/bc/dist
	cd $(RS_LIB_DIR); \
	RUSTFLAGS="--emit=llvm-bc -C linker=${TRUE_CMD}" cargo build -p powersync_loadable --profile wasm --no-default-features --features "powersync_core/static powersync_core/omit_load_extension sqlite_nostd/static sqlite_nostd/omit_load_extension" -Z build-std=panic_abort,core,alloc --target $(RS_WASM_TGT)


## debug
.PHONY: clean-debug
clean-debug:
	rm -rf debug

.PHONY: debug
debug: debug/wa-sqlite.mjs debug/wa-sqlite-async.mjs debug/wa-sqlite-jspi.mjs

debug/wa-sqlite.mjs: $(OBJ_FILES_DEBUG) $(RS_DEBUG_BC) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(RS_WASM_TGT_DIR)/debug/deps/*.bc \
	  $(OBJ_FILES_DEBUG) *.o -o $@

debug/wa-sqlite-async.mjs: $(OBJ_FILES_DEBUG) $(RS_DEBUG_BC) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DEBUG) \
	  $(RS_WASM_TGT_DIR)/debug/deps/*.bc \
	  $(OBJ_FILES_DEBUG) *.o -o $@

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

debug/wa-sqlite-jspi.mjs: $(OBJ_FILES_DEBUG) $(JSFILES) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)
	mkdir -p debug
	$(EMCC) $(EMFLAGS_DEBUG) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_JSPI) \
	  $(RS_WASM_TGT_DIR)/wasm/deps/*.bc \
	  $(OBJ_FILES_DEBUG) -o $@

## dist
.PHONY: clean-dist
clean-dist:
	rm -rf dist

.PHONY: dist
dist: dist/wa-sqlite.mjs dist/wa-sqlite-async.mjs dist/wa-sqlite-jspi.mjs

dist/wa-sqlite.mjs: $(OBJ_FILES_DIST) $(RS_RELEASE_BC) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(RS_WASM_TGT_DIR)/wasm/deps/*.bc \
	  $(OBJ_FILES_DIST)  -o $@

dist/wa-sqlite-async.mjs: $(OBJ_FILES_DIST) $(RS_RELEASE_BC) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_ASYNCIFY_DIST) \
	  $(RS_WASM_TGT_DIR)/wasm/deps/*.bc \
	  $(OBJ_FILES_DIST) -o $@

dist/wa-sqlite-jspi.mjs: $(OBJ_FILES_DIST) $(JSFILES) $(EXPORTED_FUNCTIONS) $(EXPORTED_RUNTIME_METHODS) $(ASYNCIFY_IMPORTS)
	mkdir -p dist
	$(EMCC) $(EMFLAGS_DIST) \
	  $(EMFLAGS_INTERFACES) \
	  $(EMFLAGS_LIBRARIES) \
	  $(EMFLAGS_JSPI) \
	  $(RS_WASM_TGT_DIR)/wasm/deps/*.bc \
	  $(OBJ_FILES_DIST) -o $@

FORCE:

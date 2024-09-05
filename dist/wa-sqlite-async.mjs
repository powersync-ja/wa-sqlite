var Module = (() => {
<<<<<<< HEAD
  var _scriptDir = import.meta.url;

  return function (moduleArg = {}) {
    var Module = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    Module['ready'] = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    var moduleOverrides = Object.assign({}, Module);
    var arguments_ = [];
    var thisProgram = './this.program';
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = typeof window == 'object';
    var ENVIRONMENT_IS_WORKER = typeof importScripts == 'function';
    var ENVIRONMENT_IS_NODE =
      typeof process == 'object' && typeof process.versions == 'object' && typeof process.versions.node == 'string';
    var scriptDirectory = '';
    function locateFile(path) {
      if (Module['locateFile']) {
        return Module['locateFile'](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readAsync, readBinary;
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != 'undefined' && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf('blob:') !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/') + 1);
      } else {
        scriptDirectory = '';
      }
      {
        read_ = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, false);
          xhr.send(null);
          return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.responseType = 'arraybuffer';
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'arraybuffer';
          xhr.onload = () => {
            if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
              onload(xhr.response);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
    } else {
    }
    var out = Module['print'] || console.log.bind(console);
    var err = Module['printErr'] || console.error.bind(console);
    Object.assign(Module, moduleOverrides);
    moduleOverrides = null;
    if (Module['arguments']) arguments_ = Module['arguments'];
    if (Module['thisProgram']) thisProgram = Module['thisProgram'];
    if (Module['quit']) quit_ = Module['quit'];
    var wasmBinary;
    if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
    if (typeof WebAssembly != 'object') {
      abort('no native wasm support detected');
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
      }
    }
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module['HEAP8'] = HEAP8 = new Int8Array(b);
      Module['HEAP16'] = HEAP16 = new Int16Array(b);
      Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
      Module['HEAPU16'] = HEAPU16 = new Uint16Array(b);
      Module['HEAP32'] = HEAP32 = new Int32Array(b);
      Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
      Module['HEAPF32'] = HEAPF32 = new Float32Array(b);
      Module['HEAPF64'] = HEAPF64 = new Float64Array(b);
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function preRun() {
      if (Module['preRun']) {
        if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
        while (Module['preRun'].length) {
          addOnPreRun(Module['preRun'].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      runtimeInitialized = true;
      if (!Module['noFSInit'] && !FS.init.initialized) FS.init();
      FS.ignorePermissions = false;
      TTY.init();
      callRuntimeCallbacks(__ATINIT__);
    }
    function preMain() {
      callRuntimeCallbacks(__ATMAIN__);
    }
    function postRun() {
      if (Module['postRun']) {
        if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
        while (Module['postRun'].length) {
          addOnPostRun(Module['postRun'].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    function addRunDependency(id) {
      runDependencies++;
      if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      if (Module['onAbort']) {
        Module['onAbort'](what);
      }
      what = 'Aborted(' + what + ')';
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      what += '. Build with -sASSERTIONS for more info.';
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = 'data:application/octet-stream;base64,';
    var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
    var wasmBinaryFile;
    if (Module['locateFile']) {
      wasmBinaryFile = 'wa-sqlite-async.wasm';
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL('wa-sqlite-async.wasm', import.meta.url).href;
    }
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw 'both async and sync fetching of the wasm failed';
    }
    function getBinaryPromise(binaryFile) {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == 'function') {
          return fetch(binaryFile, { credentials: 'same-origin' })
            .then((response) => {
              if (!response['ok']) {
                throw "failed to load wasm binary file at '" + binaryFile + "'";
              }
              return response['arrayBuffer']();
            })
            .catch(() => getBinarySync(binaryFile));
        }
      }
      return Promise.resolve().then(() => getBinarySync(binaryFile));
    }
    function instantiateArrayBuffer(binaryFile, imports, receiver) {
      return getBinaryPromise(binaryFile)
        .then((binary) => WebAssembly.instantiate(binary, imports))
        .then((instance) => instance)
        .then(receiver, (reason) => {
          err(`failed to asynchronously prepare wasm: ${reason}`);
          abort(reason);
        });
    }
    function instantiateAsync(binary, binaryFile, imports, callback) {
      if (
        !binary &&
        typeof WebAssembly.instantiateStreaming == 'function' &&
        !isDataURI(binaryFile) &&
        typeof fetch == 'function'
      ) {
        return fetch(binaryFile, { credentials: 'same-origin' }).then((response) => {
          var result = WebAssembly.instantiateStreaming(response, imports);
          return result.then(callback, function (reason) {
            err(`wasm streaming compile failed: ${reason}`);
            err('falling back to ArrayBuffer instantiation');
            return instantiateArrayBuffer(binaryFile, imports, callback);
          });
        });
      }
      return instantiateArrayBuffer(binaryFile, imports, callback);
    }
    function createWasm() {
      var info = { a: wasmImports };
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        wasmExports = Asyncify.instrumentWasmExports(wasmExports);
        wasmMemory = wasmExports['ja'];
        updateMemoryViews();
        wasmTable = wasmExports['bf'];
        addOnInit(wasmExports['ka']);
        removeRunDependency('wasm-instantiate');
        return wasmExports;
      }
      addRunDependency('wasm-instantiate');
      function receiveInstantiationResult(result) {
        receiveInstance(result['instance']);
      }
      if (Module['instantiateWasm']) {
        try {
          return Module['instantiateWasm'](info, receiveInstance);
        } catch (e) {
          err(`Module.instantiateWasm callback failed with error: ${e}`);
          readyPromiseReject(e);
        }
      }
      instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
      return {};
    }
    var tempDouble;
    var tempI64;
    function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    };
    function getValue(ptr, type = 'i8') {
      if (type.endsWith('*')) type = '*';
      switch (type) {
        case 'i1':
          return HEAP8[ptr >> 0];
        case 'i8':
          return HEAP8[ptr >> 0];
        case 'i16':
          return HEAP16[ptr >> 1];
        case 'i32':
          return HEAP32[ptr >> 2];
        case 'i64':
          abort('to do getValue(i64) use WASM_BIGINT');
        case 'float':
          return HEAPF32[ptr >> 2];
        case 'double':
          return HEAPF64[ptr >> 3];
        case '*':
          return HEAPU32[ptr >> 2];
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    var noExitRuntime = Module['noExitRuntime'] || true;
    function setValue(ptr, value, type = 'i8') {
      if (type.endsWith('*')) type = '*';
      switch (type) {
        case 'i1':
          HEAP8[ptr >> 0] = value;
          break;
        case 'i8':
          HEAP8[ptr >> 0] = value;
          break;
        case 'i16':
          HEAP16[ptr >> 1] = value;
          break;
        case 'i32':
          HEAP32[ptr >> 2] = value;
          break;
        case 'i64':
          abort('to do setValue(i64) use WASM_BIGINT');
        case 'float':
          HEAPF32[ptr >> 2] = value;
          break;
        case 'double':
          HEAPF64[ptr >> 3] = value;
          break;
        case '*':
          HEAPU32[ptr >> 2] = value;
          break;
        default:
          abort(`invalid type for setValue: ${type}`);
      }
    }
    var UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;
    var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode(((u0 & 31) << 6) | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
        }
      }
      return str;
    };
    var UTF8ToString = (ptr, maxBytesToRead) => (ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '');
    var ___assert_fail = (condition, filename, line, func) => {
      abort(
        `Assertion failed: ${UTF8ToString(condition)}, at: ` +
          [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']
      );
    };
    var PATH = {
      isAbs: (path) => path.charAt(0) === '/',
      splitPath: (filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
      normalizeArray: (parts, allowAboveRoot) => {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
      normalize: (path) => {
        var isAbsolute = PATH.isAbs(path),
          trailingSlash = path.substr(-1) === '/';
        path = PATH.normalizeArray(
          path.split('/').filter((p) => !!p),
          !isAbsolute
        ).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
      dirname: (path) => {
        var result = PATH.splitPath(path),
          root = result[0],
          dir = result[1];
        if (!root && !dir) {
          return '.';
        }
        if (dir) {
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },
      basename: (path) => {
        if (path === '/') return '/';
        path = PATH.normalize(path);
        path = path.replace(/\/$/, '');
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash + 1);
      },
      join: function () {
        var paths = Array.prototype.slice.call(arguments);
        return PATH.normalize(paths.join('/'));
      },
      join2: (l, r) => PATH.normalize(l + '/' + r)
    };
    var initRandomFill = () => {
      if (typeof crypto == 'object' && typeof crypto['getRandomValues'] == 'function') {
        return (view) => crypto.getRandomValues(view);
      } else abort('initRandomDevice');
    };
    var randomFill = (view) => (randomFill = initRandomFill())(view);
    var PATH_FS = {
      resolve: function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = i >= 0 ? arguments[i] : FS.cwd();
          if (typeof path != 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return '';
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = PATH.isAbs(path);
        }
        resolvedPath = PATH.normalizeArray(
          resolvedPath.split('/').filter((p) => !!p),
          !resolvedAbsolute
        ).join('/');
        return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
      },
      relative: (from, to) => {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }
    };
    var FS_stdin_getChar_buffer = [];
    var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = (65536 + ((u & 1023) << 10)) | (u1 & 1023);
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | (u >> 6);
          heap[outIdx++] = 128 | (u & 63);
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | (u >> 12);
          heap[outIdx++] = 128 | ((u >> 6) & 63);
          heap[outIdx++] = 128 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | (u >> 18);
          heap[outIdx++] = 128 | ((u >> 12) & 63);
          heap[outIdx++] = 128 | ((u >> 6) & 63);
          heap[outIdx++] = 128 | (u & 63);
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    }
    var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (typeof window != 'undefined' && typeof window.prompt == 'function') {
          result = window.prompt('Input: ');
          if (result !== null) {
            result += '\n';
          }
        } else if (typeof readline == 'function') {
          result = readline();
          if (result !== null) {
            result += '\n';
          }
        }
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
    var TTY = {
      ttys: [],
      init() {},
      shutdown() {},
      register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
      stream_ops: {
        open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
        close(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
        read(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset + i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },
        write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }
      },
      default_tty_ops: {
        get_char(tty) {
          return FS_stdin_getChar();
        },
        put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
        fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            out(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        },
        ioctl_tcgets(tty) {
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            ]
          };
        },
        ioctl_tcsets(tty, optional_actions, data) {
          return 0;
        },
        ioctl_tiocgwinsz(tty) {
          return [24, 80];
        }
      },
      default_tty1_ops: {
        put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
        fsync(tty) {
          if (tty.output && tty.output.length > 0) {
            err(UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }
      }
    };
    var zeroMemory = (address, size) => {
      HEAPU8.fill(0, address, address + size);
      return address;
    };
    var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
    var mmapAlloc = (size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (!ptr) return 0;
      return zeroMemory(ptr, size);
    };
    var MEMFS = {
      ops_table: null,
      mount(mount) {
        return MEMFS.createNode(null, '/', 16384 | 511, 0);
      },
      createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          throw new FS.ErrnoError(63);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: { llseek: MEMFS.stream_ops.llseek }
            },
            file: {
              node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0;
          node.contents = null;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        if (parent) {
          parent.contents[name] = node;
          parent.timestamp = node.timestamp;
        }
        return node;
      },
      getFileDataAsTypedArray(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents);
      },
      expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
      },
      resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null;
          node.usedBytes = 0;
        } else {
          var oldContents = node.contents;
          node.contents = new Uint8Array(newSize);
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
          }
          node.usedBytes = newSize;
        }
      },
      node_ops: {
        getattr(node) {
          var attr = {};
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
        setattr(node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
        lookup(parent, name) {
          throw FS.genericErrors[44];
        },
        mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
        rename(old_node, new_dir, new_name) {
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {}
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
          }
          delete old_node.parent.contents[old_node.name];
          old_node.parent.timestamp = Date.now();
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          new_dir.timestamp = old_node.parent.timestamp;
          old_node.parent = new_dir;
        },
        unlink(parent, name) {
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
        rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.timestamp = Date.now();
        },
        readdir(node) {
          var entries = ['.', '..'];
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },
        symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
          node.link = oldpath;
          return node;
        },
        readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        }
      },
      stream_ops: {
        read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          if (size > 8 && contents.subarray) {
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },
        write(stream, buffer, offset, length, position, canOwn) {
          if (buffer.buffer === HEAP8.buffer) {
            canOwn = false;
          }
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
          if (buffer.subarray && (!node.contents || node.contents.subarray)) {
            if (canOwn) {
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) {
              node.contents = buffer.slice(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) {
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          MEMFS.expandFileStorage(node, position + length);
          if (node.contents.subarray && buffer.subarray) {
            node.contents.set(buffer.subarray(offset, offset + length), position);
          } else {
            for (var i = 0; i < length; i++) {
              node.contents[position + i] = buffer[offset + i];
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position + length);
          return length;
        },
        llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
        allocate(stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },
        mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            HEAP8.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },
        msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          return 0;
        }
      }
    };
    var asyncLoad = (url, onload, onerror, noRunDep) => {
      var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : '';
      readAsync(
        url,
        (arrayBuffer) => {
          assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
          onload(new Uint8Array(arrayBuffer));
          if (dep) removeRunDependency(dep);
        },
        (event) => {
          if (onerror) {
            onerror();
          } else {
            throw `Loading data file "${url}" failed.`;
          }
        }
      );
      if (dep) addRunDependency(dep);
    };
    var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) =>
      FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    var preloadPlugins = Module['preloadPlugins'] || [];
    var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      if (typeof Browser != 'undefined') Browser.init();
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin['canHandle'](fullname)) {
          plugin['handle'](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
    var FS_createPreloadedFile = (
      parent,
      name,
      url,
      canRead,
      canWrite,
      onload,
      onerror,
      dontCreateFile,
      canOwn,
      preFinish
    ) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`);
      function processData(byteArray) {
        function finish(byteArray) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
          }
          if (onload) onload();
          removeRunDependency(dep);
        }
        if (
          FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
            if (onerror) onerror();
            removeRunDependency(dep);
          })
        ) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == 'string') {
        asyncLoad(url, (byteArray) => processData(byteArray), onerror);
      } else {
        processData(url);
      }
    };
    var FS_modeStringToFlags = (str) => {
      var flagModes = { r: 0, 'r+': 2, w: 512 | 64 | 1, 'w+': 512 | 64 | 2, a: 1024 | 64 | 1, 'a+': 1024 | 64 | 2 };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
    var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
    var FS = {
      root: null,
      mounts: [],
      devices: {},
      streams: [],
      nextInode: 1,
      nameTable: null,
      currentPath: '/',
      initialized: false,
      ignorePermissions: true,
      ErrnoError: null,
      genericErrors: {},
      filesystems: null,
      syncFSRequests: 0,
      lookupPath(path, opts = {}) {
        path = PATH_FS.resolve(path);
        if (!path) return { path: '', node: null };
        var defaults = { follow_mount: true, recurse_count: 0 };
        opts = Object.assign(defaults, opts);
        if (opts.recurse_count > 8) {
          throw new FS.ErrnoError(32);
        }
        var parts = path.split('/').filter((p) => !!p);
        var current = FS.root;
        var current_path = '/';
        for (var i = 0; i < parts.length; i++) {
          var islast = i === parts.length - 1;
          if (islast && opts.parent) {
            break;
          }
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
              current = lookup.node;
              if (count++ > 40) {
                throw new FS.ErrnoError(32);
              }
            }
          }
        }
        return { path: current_path, node: current };
      },
      getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length - 1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
      hashName(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
      hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
      hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
      lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        return FS.lookup(parent, name);
      },
      createNode(parent, name, mode, rdev) {
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node;
      },
      destroyNode(node) {
        FS.hashRemoveNode(node);
      },
      isRoot(node) {
        return node === node.parent;
      },
      isMountpoint(node) {
        return !!node.mounted;
      },
      isFile(mode) {
        return (mode & 61440) === 32768;
      },
      isDir(mode) {
        return (mode & 61440) === 16384;
      },
      isLink(mode) {
        return (mode & 61440) === 40960;
      },
      isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
      isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
      isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
      isSocket(mode) {
        return (mode & 49152) === 49152;
      },
      flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if (flag & 512) {
          perms += 'w';
        }
        return perms;
      },
      nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        } else if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        } else if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
      mayLookup(dir) {
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
      mayCreate(dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {}
        return FS.nodePermissions(dir, 'wx');
      },
      mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return 31;
          }
        }
        return 0;
      },
      mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        } else if (FS.isDir(node.mode)) {
          if (FS.flagsToPermissionString(flags) !== 'r' || flags & 512) {
            return 31;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },
      MAX_OPEN_FDS: 4096,
      nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
      getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
      getStream: (fd) => FS.streams[fd],
      createStream(stream, fd = -1) {
        if (!FS.FSStream) {
          FS.FSStream = function () {
            this.shared = {};
          };
          FS.FSStream.prototype = {};
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get() {
                return this.node;
              },
              set(val) {
                this.node = val;
              }
            },
            isRead: {
              get() {
                return (this.flags & 2097155) !== 1;
              }
            },
            isWrite: {
              get() {
                return (this.flags & 2097155) !== 0;
              }
            },
            isAppend: {
              get() {
                return this.flags & 1024;
              }
            },
            flags: {
              get() {
                return this.shared.flags;
              },
              set(val) {
                this.shared.flags = val;
              }
            },
            position: {
              get() {
                return this.shared.position;
              },
              set(val) {
                this.shared.position = val;
              }
            }
          });
        }
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
      closeStream(fd) {
        FS.streams[fd] = null;
      },
      chrdev_stream_ops: {
        open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          stream.stream_ops = device.stream_ops;
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },
        llseek() {
          throw new FS.ErrnoError(70);
        }
      },
      major: (dev) => dev >> 8,
      minor: (dev) => dev & 255,
      makedev: (ma, mi) => (ma << 8) | mi,
      registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
      getDevice: (dev) => FS.devices[dev],
      getMounts(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
          var m = check.pop();
          mounts.push(m);
          check.push.apply(check, m.mounts);
        }
        return mounts;
      },
      syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
        function doCallback(errCode) {
          FS.syncFSRequests--;
          return callback(errCode);
        }
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        }
        mounts.forEach((mount) => {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },
      mount(type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
          mountpoint = lookup.path;
          node = lookup.node;
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
        var mount = { type: type, opts: opts, mountpoint: mountpoint, mounts: [] };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          node.mounted = mount;
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
        return mountRoot;
      },
      unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((hash) => {
          var current = FS.nameTable[hash];
          while (current) {
            var next = current.name_next;
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
            current = next;
          }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1);
      },
      lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
      mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
      create(path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
      mkdir(path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
      mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var i = 0; i < dirs.length; ++i) {
          if (!dirs[i]) continue;
          d += '/' + dirs[i];
          try {
            FS.mkdir(d, mode);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
        }
      },
      mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 438;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
      symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
      rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {}
        if (old_node === new_node) {
          return;
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        FS.hashRemoveNode(old_node);
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          FS.hashAddNode(old_node);
        }
      },
      rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
      readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(54);
        }
        return node.node_ops.readdir(node);
      },
      unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
      readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },
      stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(63);
        }
        return node.node_ops.getattr(node);
      },
      lstat(path) {
        return FS.stat(path, true);
      },
      chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, { mode: (mode & 4095) | (node.mode & ~4095), timestamp: Date.now() });
      },
      lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
      fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.chmod(stream.node, mode);
      },
      chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        node.node_ops.setattr(node, { timestamp: Date.now() });
      },
      lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
      fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.chown(stream.node, uid, gid);
      },
      truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        node.node_ops.setattr(node, { size: len, timestamp: Date.now() });
      },
      ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.truncate(stream.node, len);
      },
      utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) });
      },
      open(path, flags, mode) {
        if (path === '') {
          throw new FS.ErrnoError(44);
        }
        flags = typeof flags == 'string' ? FS_modeStringToFlags(flags) : flags;
        mode = typeof mode == 'undefined' ? 438 : mode;
        if (flags & 64) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path == 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, { follow: !(flags & 131072) });
            node = lookup.node;
          } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
          if (node) {
            if (flags & 128) {
              throw new FS.ErrnoError(20);
            }
          } else {
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        if (flags & 512 && !created) {
          FS.truncate(node, 0);
        }
        flags &= ~(128 | 512 | 131072);
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          ungotten: [],
          error: false
        });
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
          }
        }
        return stream;
      },
      close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null;
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
      isClosed(stream) {
        return stream.fd === null;
      },
      llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
      read(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
      write(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
      allocate(stream, offset, length) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(28);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(138);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },
      mmap(stream, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
      msync(stream, buffer, offset, length, mmapFlags) {
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
      munmap: (stream) => 0,
      ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
      readFile(path, opts = {}) {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error(`Invalid encoding type "${opts.encoding}"`);
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },
      writeFile(path, data, opts = {}) {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == 'string') {
          var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
        } else if (ArrayBuffer.isView(data)) {
          FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        } else {
          throw new Error('Unsupported data type');
        }
        FS.close(stream);
      },
      cwd: () => FS.currentPath,
      chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
      createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
      createDefaultDevices() {
        FS.mkdir('/dev');
        FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        var randomBuffer = new Uint8Array(1024),
          randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomLeft = randomFill(randomBuffer).byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
      createSpecialDirectories() {
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount(
          {
            mount() {
              var node = FS.createNode(proc_self, 'fd', 16384 | 511, 73);
              node.node_ops = {
                lookup(parent, name) {
                  var fd = +name;
                  var stream = FS.getStreamChecked(fd);
                  var ret = { parent: null, mount: { mountpoint: 'fake' }, node_ops: { readlink: () => stream.path } };
                  ret.parent = ret;
                  return ret;
                }
              };
              return node;
            }
          },
          {},
          '/proc/self/fd'
        );
      },
      createStandardStreams() {
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
      },
      ensureErrnoError() {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.name = 'ErrnoError';
          this.node = node;
          this.setErrno = function (errno) {
            this.errno = errno;
          };
          this.setErrno(errno);
          this.message = 'FS error';
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [44].forEach((code) => {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },
      staticInit() {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, '/');
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = { MEMFS: MEMFS };
      },
      init(input, output, error) {
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
        FS.createStandardStreams();
      },
      quit() {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },
      findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
      analyzePath(path, dontResolveLastLink) {
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {}
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        }
        return ret;
      },
      createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {}
          parent = current;
        }
        return current;
      },
      createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
      createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data == 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },
      createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset + i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset + i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
      forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != 'undefined') {
          throw new Error(
            'Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.'
          );
        } else if (read_) {
          try {
            obj.contents = intArrayFromString(read_(obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
      },
      createLazyFile(parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = [];
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length - 1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize) | 0;
          return this.getter(chunkNum)[chunkOffset];
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
            throw new Error("Couldn't load " + url + '. Status: ' + xhr.status);
          var datalength = Number(xhr.getResponseHeader('Content-length'));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes';
          var usesGzip = (header = xhr.getResponseHeader('Content-Encoding')) && header === 'gzip';
          var chunkSize = 1024 * 1024;
          if (!hasByteServing) chunkSize = datalength;
          var doXHR = (from, to) => {
            if (from > to) throw new Error('invalid range (' + from + ', ' + to + ') or no bytes requested!');
            if (to > datalength - 1) throw new Error('only ' + datalength + ' bytes available! programmer error!');
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader('Range', 'bytes=' + from + '-' + to);
            xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
            xhr.send(null);
            if (!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304))
              throw new Error("Couldn't load " + url + '. Status: ' + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            }
            return intArrayFromString(xhr.responseText || '', true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1;
            end = Math.min(end, datalength - 1);
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof lazyArray.chunks[chunkNum] == 'undefined') throw new Error('doXHR failed!');
            return lazyArray.chunks[chunkNum];
          });
          if (usesGzip || !datalength) {
            chunkSize = datalength = 1;
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out('LazyFiles on gzip forces download of the whole file when length is accessed');
          }
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        };
        if (typeof XMLHttpRequest != 'undefined') {
          if (!ENVIRONMENT_IS_WORKER)
            throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperties(lazyArray, {
            length: {
              get: function () {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            },
            chunkSize: {
              get: function () {
                if (!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            }
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        Object.defineProperties(node, {
          usedBytes: {
            get: function () {
              return this.contents.length;
            }
          }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((key) => {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            FS.forceLoadFile(node);
            return fn.apply(null, arguments);
          };
        });
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length) return 0;
          var size = Math.min(contents.length - position, length);
          if (contents.slice) {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position);
        };
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr: ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      }
    };
    var SYSCALLS = {
      DEFAULT_POLLMASK: 5,
      calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);
          }
          return dir;
        }
        return PATH.join2(dir, path);
      },
      doStat(func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            return -54;
          }
          throw e;
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[(buf + 4) >> 2] = stat.mode;
        HEAPU32[(buf + 8) >> 2] = stat.nlink;
        HEAP32[(buf + 12) >> 2] = stat.uid;
        HEAP32[(buf + 16) >> 2] = stat.gid;
        HEAP32[(buf + 20) >> 2] = stat.rdev;
        (tempI64 = [
          stat.size >>> 0,
          ((tempDouble = stat.size),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(buf + 24) >> 2] = tempI64[0]),
          (HEAP32[(buf + 28) >> 2] = tempI64[1]);
        HEAP32[(buf + 32) >> 2] = 4096;
        HEAP32[(buf + 36) >> 2] = stat.blocks;
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        (tempI64 = [
          Math.floor(atime / 1e3) >>> 0,
          ((tempDouble = Math.floor(atime / 1e3)),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(buf + 40) >> 2] = tempI64[0]),
          (HEAP32[(buf + 44) >> 2] = tempI64[1]);
        HEAPU32[(buf + 48) >> 2] = (atime % 1e3) * 1e3;
        (tempI64 = [
          Math.floor(mtime / 1e3) >>> 0,
          ((tempDouble = Math.floor(mtime / 1e3)),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(buf + 56) >> 2] = tempI64[0]),
          (HEAP32[(buf + 60) >> 2] = tempI64[1]);
        HEAPU32[(buf + 64) >> 2] = (mtime % 1e3) * 1e3;
        (tempI64 = [
          Math.floor(ctime / 1e3) >>> 0,
          ((tempDouble = Math.floor(ctime / 1e3)),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(buf + 72) >> 2] = tempI64[0]),
          (HEAP32[(buf + 76) >> 2] = tempI64[1]);
        HEAPU32[(buf + 80) >> 2] = (ctime % 1e3) * 1e3;
        (tempI64 = [
          stat.ino >>> 0,
          ((tempDouble = stat.ino),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(buf + 88) >> 2] = tempI64[0]),
          (HEAP32[(buf + 92) >> 2] = tempI64[1]);
        return 0;
      },
      doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
      varargs: undefined,
      get() {
        var ret = HEAP32[+SYSCALLS.varargs >> 2];
        SYSCALLS.varargs += 4;
        return ret;
      },
      getp() {
        return SYSCALLS.get();
      },
      getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
      getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      }
    };
    function ___syscall_chmod(path, mode) {
      try {
        path = SYSCALLS.getStr(path);
        FS.chmod(path, mode);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_faccessat(dirfd, path, amode, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (amode & ~7) {
          return -28;
        }
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node) {
          return -44;
        }
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms && FS.nodePermissions(node, perms)) {
          return -2;
        }
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_fchmod(fd, mode) {
      try {
        FS.fchmod(fd, mode);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_fchown32(fd, owner, group) {
      try {
        FS.fchown(fd, owner, group);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    var setErrNo = (value) => {
      HEAP32[___errno_location() >> 2] = value;
      return value;
    };
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = SYSCALLS.get();
            if (arg < 0) {
              return -28;
            }
            while (FS.streams[arg]) {
              arg++;
            }
            var newStream;
            newStream = FS.createStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = SYSCALLS.get();
            stream.flags |= arg;
            return 0;
          }
          case 5: {
            var arg = SYSCALLS.getp();
            var offset = 0;
            HEAP16[(arg + offset) >> 1] = 2;
            return 0;
          }
          case 6:
          case 7:
            return 0;
          case 16:
          case 8:
            return -28;
          case 9:
            setErrNo(28);
            return -1;
          default: {
            return -28;
          }
        }
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_fstat64(fd, buf) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        return SYSCALLS.doStat(FS.stat, stream.path, buf);
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    var convertI32PairToI53Checked = (lo, hi) =>
      (hi + 2097152) >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
    function ___syscall_ftruncate64(fd, length_low, length_high) {
      var length = convertI32PairToI53Checked(length_low, length_high);
      try {
        if (isNaN(length)) return 61;
        FS.ftruncate(fd, length);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    function ___syscall_getcwd(buf, size) {
      try {
        if (size === 0) return -28;
        var cwd = FS.cwd();
        var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
        if (size < cwdLengthInBytes) return -68;
        stringToUTF8(cwd, buf, size);
        return cwdLengthInBytes;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_lstat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doStat(FS.lstat, path, buf);
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_mkdirat(dirfd, path, mode) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        path = PATH.normalize(path);
        if (path[path.length - 1] === '/') path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_newfstatat(dirfd, path, buf, flags) {
      try {
        path = SYSCALLS.getStr(path);
        var nofollow = flags & 256;
        var allowEmpty = flags & 4096;
        flags = flags & ~6400;
        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
        return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_openat(dirfd, path, flags, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? SYSCALLS.get() : 0;
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (bufsize <= 0) return -28;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doStat(FS.stat, path, buf);
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function ___syscall_unlinkat(dirfd, path, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (flags === 0) {
          FS.unlink(path);
        } else if (flags === 512) {
          FS.rmdir(path);
        } else {
          abort('Invalid flags passed to unlinkat');
        }
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    var readI53FromI64 = (ptr) => HEAPU32[ptr >> 2] + HEAP32[(ptr + 4) >> 2] * 4294967296;
    function ___syscall_utimensat(dirfd, path, times, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path, true);
        if (!times) {
          var atime = Date.now();
          var mtime = atime;
        } else {
          var seconds = readI53FromI64(times);
          var nanoseconds = HEAP32[(times + 8) >> 2];
          atime = seconds * 1e3 + nanoseconds / (1e3 * 1e3);
          times += 16;
          seconds = readI53FromI64(times);
          nanoseconds = HEAP32[(times + 8) >> 2];
          mtime = seconds * 1e3 + nanoseconds / (1e3 * 1e3);
        }
        FS.utime(path, atime, mtime);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    };
    function __localtime_js(time_low, time_high, tmPtr) {
      var time = convertI32PairToI53Checked(time_low, time_high);
      var date = new Date(time * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[(tmPtr + 4) >> 2] = date.getMinutes();
      HEAP32[(tmPtr + 8) >> 2] = date.getHours();
      HEAP32[(tmPtr + 12) >> 2] = date.getDate();
      HEAP32[(tmPtr + 16) >> 2] = date.getMonth();
      HEAP32[(tmPtr + 20) >> 2] = date.getFullYear() - 1900;
      HEAP32[(tmPtr + 24) >> 2] = date.getDay();
      var yday = ydayFromDate(date) | 0;
      HEAP32[(tmPtr + 28) >> 2] = yday;
      HEAP32[(tmPtr + 36) >> 2] = -(date.getTimezoneOffset() * 60);
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[(tmPtr + 32) >> 2] = dst;
    }
    function __mmap_js(len, prot, flags, fd, offset_low, offset_high, allocated, addr) {
      var offset = convertI32PairToI53Checked(offset_low, offset_high);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        var res = FS.mmap(stream, len, offset, prot, flags);
        var ptr = res.ptr;
        HEAP32[allocated >> 2] = res.allocated;
        HEAPU32[addr >> 2] = ptr;
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    function __munmap_js(addr, len, prot, flags, fd, offset_low, offset_high) {
      var offset = convertI32PairToI53Checked(offset_low, offset_high);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (prot & 2) {
          SYSCALLS.doMsync(addr, stream, len, flags, offset);
        }
        FS.munmap(stream);
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return -e.errno;
      }
    }
    var stringToNewUTF8 = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8(str, ret, size);
      return ret;
    };
    var __tzset_js = (timezone, daylight, tzname) => {
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      function extractZone(date) {
        var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
        return match ? match[1] : 'GMT';
      }
      var winterName = extractZone(winter);
      var summerName = extractZone(summer);
      var winterNamePtr = stringToNewUTF8(winterName);
      var summerNamePtr = stringToNewUTF8(summerName);
      if (summerOffset < winterOffset) {
        HEAPU32[tzname >> 2] = winterNamePtr;
        HEAPU32[(tzname + 4) >> 2] = summerNamePtr;
      } else {
        HEAPU32[tzname >> 2] = summerNamePtr;
        HEAPU32[(tzname + 4) >> 2] = winterNamePtr;
      }
    };
    var _emscripten_date_now = () => Date.now();
    var _emscripten_get_now;
    _emscripten_get_now = () => performance.now();
    var getHeapMax = () => 2147483648;
    var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {}
    };
    var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      var alignUp = (x, multiple) => x + ((multiple - (x % multiple)) % multiple);
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    };
    var ENV = {};
    var getExecutableName = () => thisProgram || './this.program';
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang =
          ((typeof navigator == 'object' && navigator.languages && navigator.languages[0]) || 'C').replace('-', '_') +
          '.UTF-8';
        var env = {
          USER: 'web_user',
          LOGNAME: 'web_user',
          PATH: '/',
          PWD: '/',
          HOME: '/home/web_user',
          LANG: lang,
          _: getExecutableName()
        };
        for (var x in ENV) {
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    var stringToAscii = (str, buffer) => {
      for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i);
      }
      HEAP8[buffer >> 0] = 0;
    };
    var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      getEnvStrings().forEach((string, i) => {
        var ptr = environ_buf + bufSize;
        HEAPU32[(__environ + i * 4) >> 2] = ptr;
        stringToAscii(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    };
    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach((string) => (bufSize += string.length + 1));
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return e.errno;
      }
    }
    function _fd_fdstat_get(fd, pbuf) {
      try {
        var rightsBase = 0;
        var rightsInheriting = 0;
        var flags = 0;
        {
          var stream = SYSCALLS.getStreamFromFD(fd);
          var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
        }
        HEAP8[pbuf >> 0] = type;
        HEAP16[(pbuf + 2) >> 1] = flags;
        (tempI64 = [
          rightsBase >>> 0,
          ((tempDouble = rightsBase),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(pbuf + 8) >> 2] = tempI64[0]),
          (HEAP32[(pbuf + 12) >> 2] = tempI64[1]);
        (tempI64 = [
          rightsInheriting >>> 0,
          ((tempDouble = rightsInheriting),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[(pbuf + 16) >> 2] = tempI64[0]),
          (HEAP32[(pbuf + 20) >> 2] = tempI64[1]);
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return e.errno;
      }
    }
    var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[(iov + 4) >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
        if (typeof offset !== 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return e.errno;
      }
    }
    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      var offset = convertI32PairToI53Checked(offset_low, offset_high);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        (tempI64 = [
          stream.position >>> 0,
          ((tempDouble = stream.position),
          +Math.abs(tempDouble) >= 1
            ? tempDouble > 0
              ? +Math.floor(tempDouble / 4294967296) >>> 0
              : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0
            : 0)
        ]),
          (HEAP32[newOffset >> 2] = tempI64[0]),
          (HEAP32[(newOffset + 4) >> 2] = tempI64[1]);
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return e.errno;
      }
    }
    var _fd_sync = function (fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        return Asyncify.handleSleep((wakeUp) => {
          var mount = stream.node.mount;
          if (!mount.type.syncfs) {
            wakeUp(0);
            return;
          }
          mount.type.syncfs(mount, false, (err) => {
            if (err) {
              wakeUp(29);
              return;
            }
            wakeUp(0);
          });
        });
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return e.errno;
      }
    };
    _fd_sync.isAsync = true;
    var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[(iov + 4) >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (typeof offset !== 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
        return e.errno;
      }
    }
    var adapters_support = function () {
      const handleAsync = typeof Asyncify === 'object' ? Asyncify.handleAsync.bind(Asyncify) : null;
      Module['handleAsync'] = handleAsync;
      const targets = new Map();
      Module['setCallback'] = (key, target) => targets.set(key, target);
      Module['getCallback'] = (key) => targets.get(key);
      Module['deleteCallback'] = (key) => targets.delete(key);
      adapters_support = function (isAsync, key, ...args) {
        const receiver = targets.get(key);
        let methodName = null;
        const f = typeof receiver === 'function' ? receiver : receiver[(methodName = UTF8ToString(args.shift()))];
        if (isAsync) {
          if (handleAsync) {
            return handleAsync(() => f.apply(receiver, args));
          }
          throw new Error('Synchronous WebAssembly cannot call async function');
        }
        const result = f.apply(receiver, args);
        if (typeof result?.then == 'function') {
          console.error('unexpected Promise', f);
          throw new Error(`${methodName} unexpectedly returned a Promise`);
        }
        return result;
      };
    };
    function _ipp(...args) {
      return adapters_support(false, ...args);
    }
    function _ipp_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipp_async.isAsync = true;
    function _ippipppp(...args) {
      return adapters_support(false, ...args);
    }
    function _ippipppp_async(...args) {
      return adapters_support(true, ...args);
    }
    _ippipppp_async.isAsync = true;
    function _ippp(...args) {
      return adapters_support(false, ...args);
    }
    function _ippp_async(...args) {
      return adapters_support(true, ...args);
    }
    _ippp_async.isAsync = true;
    function _ipppi(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppi_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppi_async.isAsync = true;
    function _ipppiii(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppiii_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppiii_async.isAsync = true;
    function _ipppiiip(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppiiip_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppiiip_async.isAsync = true;
    function _ipppip(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppip_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppip_async.isAsync = true;
    function _ipppj(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppj_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppj_async.isAsync = true;
    function _ipppp(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppp_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppp_async.isAsync = true;
    function _ippppi(...args) {
      return adapters_support(false, ...args);
    }
    function _ippppi_async(...args) {
      return adapters_support(true, ...args);
    }
    _ippppi_async.isAsync = true;
    function _ippppij(...args) {
      return adapters_support(false, ...args);
    }
    function _ippppij_async(...args) {
      return adapters_support(true, ...args);
    }
    _ippppij_async.isAsync = true;
    function _ippppip(...args) {
      return adapters_support(false, ...args);
    }
    function _ippppip_async(...args) {
      return adapters_support(true, ...args);
    }
    _ippppip_async.isAsync = true;
    function _ipppppip(...args) {
      return adapters_support(false, ...args);
    }
    function _ipppppip_async(...args) {
      return adapters_support(true, ...args);
    }
    _ipppppip_async.isAsync = true;
    function _vppp(...args) {
      return adapters_support(false, ...args);
    }
    function _vppp_async(...args) {
      return adapters_support(true, ...args);
    }
    _vppp_async.isAsync = true;
    function _vpppip(...args) {
      return adapters_support(false, ...args);
    }
    function _vpppip_async(...args) {
      return adapters_support(true, ...args);
    }
    _vpppip_async.isAsync = true;
    var runtimeKeepaliveCounter = 0;
    var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
    var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        if (Module['onExit']) Module['onExit'](code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    };
    var handleException = (e) => {
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      quit_(1, e);
    };
    var runAndAbortIfError = (func) => {
      try {
        return func();
      } catch (e) {
        abort(e);
      }
    };
    var _exit = exitJS;
    var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
    var callUserCallback = (func) => {
      if (ABORT) {
        return;
      }
      try {
        func();
        maybeExit();
      } catch (e) {
        handleException(e);
      }
    };
    var sigToWasmTypes = (sig) => {
      var typeNames = { i: 'i32', j: 'i64', f: 'f32', d: 'f64', e: 'externref', p: 'i32' };
      var type = { parameters: [], results: sig[0] == 'v' ? [] : [typeNames[sig[0]]] };
      for (var i = 1; i < sig.length; ++i) {
        type.parameters.push(typeNames[sig[i]]);
      }
      return type;
    };
    var runtimeKeepalivePush = () => {
      runtimeKeepaliveCounter += 1;
    };
    var runtimeKeepalivePop = () => {
      runtimeKeepaliveCounter -= 1;
    };
    var Asyncify = {
      instrumentWasmImports(imports) {
        var importPattern =
          /^(ipp|ipp_async|ippp|ippp_async|vppp|vppp_async|ipppj|ipppj_async|ipppi|ipppi_async|ipppp|ipppp_async|ipppip|ipppip_async|vpppip|vpppip_async|ippppi|ippppi_async|ippppij|ippppij_async|ipppiii|ipppiii_async|ippppip|ippppip_async|ippipppp|ippipppp_async|ipppppip|ipppppip_async|ipppiiip|ipppiiip_async|invoke_.*|__asyncjs__.*)$/;
        for (var x in imports) {
          (function (x) {
            var original = imports[x];
            var sig = original.sig;
            if (typeof original == 'function') {
              var isAsyncifyImport = original.isAsync || importPattern.test(x);
            }
          })(x);
        }
      },
      instrumentWasmExports(exports) {
        var ret = {};
        for (var x in exports) {
          (function (x) {
            var original = exports[x];
            if (typeof original == 'function') {
              ret[x] = function () {
                Asyncify.exportCallStack.push(x);
                try {
                  return original.apply(null, arguments);
                } finally {
                  if (!ABORT) {
                    var y = Asyncify.exportCallStack.pop();
                    assert(y === x);
                    Asyncify.maybeStopUnwind();
                  }
                }
              };
            } else {
              ret[x] = original;
            }
          })(x);
        }
        return ret;
      },
      State: { Normal: 0, Unwinding: 1, Rewinding: 2, Disabled: 3 },
      state: 0,
      StackSize: 16384,
      currData: null,
      handleSleepReturnValue: 0,
      exportCallStack: [],
      callStackNameToId: {},
      callStackIdToName: {},
      callStackId: 0,
      asyncPromiseHandlers: null,
      sleepCallbacks: [],
      getCallStackId(funcName) {
        var id = Asyncify.callStackNameToId[funcName];
        if (id === undefined) {
          id = Asyncify.callStackId++;
          Asyncify.callStackNameToId[funcName] = id;
          Asyncify.callStackIdToName[id] = funcName;
        }
        return id;
      },
      maybeStopUnwind() {
        if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && Asyncify.exportCallStack.length === 0) {
          Asyncify.state = Asyncify.State.Normal;
          runAndAbortIfError(_asyncify_stop_unwind);
          if (typeof Fibers != 'undefined') {
            Fibers.trampoline();
          }
        }
      },
      whenDone() {
        return new Promise((resolve, reject) => {
          Asyncify.asyncPromiseHandlers = { resolve: resolve, reject: reject };
        });
      },
      allocateData() {
        var ptr = _malloc(12 + Asyncify.StackSize);
        Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
        Asyncify.setDataRewindFunc(ptr);
        return ptr;
      },
      setDataHeader(ptr, stack, stackSize) {
        HEAPU32[ptr >> 2] = stack;
        HEAPU32[(ptr + 4) >> 2] = stack + stackSize;
      },
      setDataRewindFunc(ptr) {
        var bottomOfCallStack = Asyncify.exportCallStack[0];
        var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
        HEAP32[(ptr + 8) >> 2] = rewindId;
      },
      getDataRewindFunc(ptr) {
        var id = HEAP32[(ptr + 8) >> 2];
        var name = Asyncify.callStackIdToName[id];
        var func = wasmExports[name];
        return func;
      },
      doRewind(ptr) {
        var start = Asyncify.getDataRewindFunc(ptr);
        return start();
      },
      handleSleep(startAsync) {
        if (ABORT) return;
        if (Asyncify.state === Asyncify.State.Normal) {
          var reachedCallback = false;
          var reachedAfterCallback = false;
          startAsync((handleSleepReturnValue = 0) => {
            if (ABORT) return;
            Asyncify.handleSleepReturnValue = handleSleepReturnValue;
            reachedCallback = true;
            if (!reachedAfterCallback) {
              return;
            }
            Asyncify.state = Asyncify.State.Rewinding;
            runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
            if (typeof Browser != 'undefined' && Browser.mainLoop.func) {
              Browser.mainLoop.resume();
            }
            var asyncWasmReturnValue,
              isError = false;
            try {
              asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
            } catch (err) {
              asyncWasmReturnValue = err;
              isError = true;
            }
            var handled = false;
            if (!Asyncify.currData) {
              var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
              if (asyncPromiseHandlers) {
                Asyncify.asyncPromiseHandlers = null;
                (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
                handled = true;
              }
            }
            if (isError && !handled) {
              throw asyncWasmReturnValue;
            }
          });
          reachedAfterCallback = true;
          if (!reachedCallback) {
            Asyncify.state = Asyncify.State.Unwinding;
            Asyncify.currData = Asyncify.allocateData();
            if (typeof Browser != 'undefined' && Browser.mainLoop.func) {
              Browser.mainLoop.pause();
            }
            runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
          }
        } else if (Asyncify.state === Asyncify.State.Rewinding) {
          Asyncify.state = Asyncify.State.Normal;
          runAndAbortIfError(_asyncify_stop_rewind);
          _free(Asyncify.currData);
          Asyncify.currData = null;
          Asyncify.sleepCallbacks.forEach((func) => callUserCallback(func));
        } else {
          abort(`invalid state: ${Asyncify.state}`);
        }
        return Asyncify.handleSleepReturnValue;
      },
      handleAsync(startAsync) {
        return Asyncify.handleSleep((wakeUp) => {
          startAsync().then(wakeUp);
        });
      }
    };
    var uleb128Encode = (n, target) => {
      if (n < 128) {
        target.push(n);
      } else {
        target.push(n % 128 | 128, n >> 7);
      }
    };
    var generateFuncType = (sig, target) => {
      var sigRet = sig.slice(0, 1);
      var sigParam = sig.slice(1);
      var typeCodes = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
      target.push(96);
      uleb128Encode(sigParam.length, target);
      for (var i = 0; i < sigParam.length; ++i) {
        target.push(typeCodes[sigParam[i]]);
      }
      if (sigRet == 'v') {
        target.push(0);
      } else {
        target.push(1, typeCodes[sigRet]);
      }
    };
    var convertJsFunctionToWasm = (func, sig) => {
      if (typeof WebAssembly.Function == 'function') {
        return new WebAssembly.Function(sigToWasmTypes(sig), func);
      }
      var typeSectionBody = [1];
      generateFuncType(sig, typeSectionBody);
      var bytes = [0, 97, 115, 109, 1, 0, 0, 0, 1];
      uleb128Encode(typeSectionBody.length, bytes);
      bytes.push.apply(bytes, typeSectionBody);
      bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
      var module = new WebAssembly.Module(new Uint8Array(bytes));
      var instance = new WebAssembly.Instance(module, { e: { f: func } });
      var wrappedFunc = instance.exports['f'];
      return wrappedFunc;
    };
    var wasmTable;
    var getWasmTableEntry = (funcPtr) => wasmTable.get(funcPtr);
    var updateTableMap = (offset, count) => {
      if (functionsInTableMap) {
        for (var i = offset; i < offset + count; i++) {
          var item = getWasmTableEntry(i);
          if (item) {
            functionsInTableMap.set(item, i);
          }
        }
      }
    };
    var functionsInTableMap;
    var getFunctionAddress = (func) => {
      if (!functionsInTableMap) {
        functionsInTableMap = new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      return functionsInTableMap.get(func) || 0;
    };
    var freeTableIndexes = [];
    var getEmptyTableSlot = () => {
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      try {
        wasmTable.grow(1);
      } catch (err) {
        if (!(err instanceof RangeError)) {
          throw err;
        }
        throw 'Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.';
      }
      return wasmTable.length - 1;
    };
    var setWasmTableEntry = (idx, func) => wasmTable.set(idx, func);
    var addFunction = (func, sig) => {
      var rtn = getFunctionAddress(func);
      if (rtn) {
        return rtn;
      }
      var ret = getEmptyTableSlot();
      try {
        setWasmTableEntry(ret, func);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw err;
        }
        var wrapped = convertJsFunctionToWasm(func, sig);
        setWasmTableEntry(ret, wrapped);
      }
      functionsInTableMap.set(func, ret);
      return ret;
    };
    var getCFunc = (ident) => {
      var func = Module['_' + ident];
      return func;
    };
    var writeArrayToMemory = (array, buffer) => {
      HEAP8.set(array, buffer);
    };
    var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
    var ccall = (ident, returnType, argTypes, args, opts) => {
      var toC = {
        string: (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) {
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        array: (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var previousAsync = Asyncify.currData;
      var ret = func.apply(null, cArgs);
      function onDone(ret) {
        runtimeKeepalivePop();
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
      var asyncMode = opts && opts.async;
      runtimeKeepalivePush();
      if (Asyncify.currData != previousAsync) {
        return Asyncify.whenDone().then(onDone);
      }
      ret = onDone(ret);
      if (asyncMode) return Promise.resolve(ret);
      return ret;
    };
    var cwrap = (ident, returnType, argTypes, opts) => {
      var numericArgs = !argTypes || argTypes.every((type) => type === 'number' || type === 'boolean');
      var numericRet = returnType !== 'string';
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return function () {
        return ccall(ident, returnType, argTypes, arguments, opts);
      };
    };
    var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
      }
      HEAP16[outPtr >> 1] = 0;
      return outPtr - startPtr;
    };
    var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
      if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = (65536 + ((codeUnit & 1023) << 10)) | (trailSurrogate & 1023);
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      HEAP32[outPtr >> 2] = 0;
      return outPtr - startPtr;
    };
    var AsciiToString = (ptr) => {
      var str = '';
      while (1) {
        var ch = HEAPU8[ptr++ >> 0];
        if (!ch) return str;
        str += String.fromCharCode(ch);
      }
    };
    var UTF16Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf-16le') : undefined;
    var UTF16ToString = (ptr, maxBytesToRead) => {
      var endPtr = ptr;
      var idx = endPtr >> 1;
      var maxIdx = idx + maxBytesToRead / 2;
      while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
      endPtr = idx << 1;
      if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
      var str = '';
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[(ptr + i * 2) >> 1];
        if (codeUnit == 0) break;
        str += String.fromCharCode(codeUnit);
      }
      return str;
    };
    var UTF32ToString = (ptr, maxBytesToRead) => {
      var i = 0;
      var str = '';
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[(ptr + i * 4) >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
          var ch = utf32 - 65536;
          str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    };
    function intArrayToString(array) {
      var ret = [];
      for (var i = 0; i < array.length; i++) {
        var chr = array[i];
        if (chr > 255) {
          chr &= 255;
        }
        ret.push(String.fromCharCode(chr));
      }
      return ret.join('');
    }
    var FSNode = function (parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.mounted = null;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.node_ops = {};
      this.stream_ops = {};
      this.rdev = rdev;
    };
    var readMode = 292 | 73;
    var writeMode = 146;
    Object.defineProperties(FSNode.prototype, {
      read: {
        get: function () {
          return (this.mode & readMode) === readMode;
        },
        set: function (val) {
          val ? (this.mode |= readMode) : (this.mode &= ~readMode);
        }
      },
      write: {
        get: function () {
          return (this.mode & writeMode) === writeMode;
        },
        set: function (val) {
          val ? (this.mode |= writeMode) : (this.mode &= ~writeMode);
        }
      },
      isFolder: {
        get: function () {
          return FS.isDir(this.mode);
        }
      },
      isDevice: {
        get: function () {
          return FS.isChrdev(this.mode);
        }
      }
    });
    FS.FSNode = FSNode;
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.staticInit();
    adapters_support();
    var wasmImports = {
      a: ___assert_fail,
      Y: ___syscall_chmod,
      $: ___syscall_faccessat,
      Z: ___syscall_fchmod,
      X: ___syscall_fchown32,
      b: ___syscall_fcntl64,
      W: ___syscall_fstat64,
      y: ___syscall_ftruncate64,
      Q: ___syscall_getcwd,
      U: ___syscall_lstat64,
      N: ___syscall_mkdirat,
      T: ___syscall_newfstatat,
      M: ___syscall_openat,
      K: ___syscall_readlinkat,
      J: ___syscall_rmdir,
      V: ___syscall_stat64,
      G: ___syscall_unlinkat,
      F: ___syscall_utimensat,
      w: __localtime_js,
      u: __mmap_js,
      v: __munmap_js,
      H: __tzset_js,
      n: _emscripten_date_now,
      m: _emscripten_get_now,
      D: _emscripten_resize_heap,
      O: _environ_get,
      P: _environ_sizes_get,
      o: _fd_close,
      E: _fd_fdstat_get,
      L: _fd_read,
      x: _fd_seek,
      S: _fd_sync,
      I: _fd_write,
      s: _ipp,
      t: _ipp_async,
      fa: _ippipppp,
      ia: _ippipppp_async,
      i: _ippp,
      j: _ippp_async,
      c: _ipppi,
      d: _ipppi_async,
      ca: _ipppiii,
      da: _ipppiii_async,
      ea: _ipppiiip,
      ga: _ipppiiip_async,
      g: _ipppip,
      h: _ipppip_async,
      z: _ipppj,
      A: _ipppj_async,
      e: _ipppp,
      f: _ipppp_async,
      aa: _ippppi,
      ba: _ippppi_async,
      B: _ippppij,
      C: _ippppij_async,
      p: _ippppip,
      q: _ippppip_async,
      ha: _ipppppip,
      r: _ipppppip_async,
      k: _vppp,
      l: _vppp_async,
      R: _vpppip,
      _: _vpppip_async
    };
    var wasmExports = createWasm();
    var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports['ka'])();
    var _sqlite3_status64 = (Module['_sqlite3_status64'] = (a0, a1, a2, a3) =>
      (_sqlite3_status64 = Module['_sqlite3_status64'] = wasmExports['la'])(a0, a1, a2, a3));
    var _sqlite3_status = (Module['_sqlite3_status'] = (a0, a1, a2, a3) =>
      (_sqlite3_status = Module['_sqlite3_status'] = wasmExports['ma'])(a0, a1, a2, a3));
    var _sqlite3_db_status = (Module['_sqlite3_db_status'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_db_status = Module['_sqlite3_db_status'] = wasmExports['na'])(a0, a1, a2, a3, a4));
    var _sqlite3_msize = (Module['_sqlite3_msize'] = (a0) =>
      (_sqlite3_msize = Module['_sqlite3_msize'] = wasmExports['oa'])(a0));
    var _sqlite3_vfs_find = (Module['_sqlite3_vfs_find'] = (a0) =>
      (_sqlite3_vfs_find = Module['_sqlite3_vfs_find'] = wasmExports['pa'])(a0));
    var _sqlite3_vfs_register = (Module['_sqlite3_vfs_register'] = (a0, a1) =>
      (_sqlite3_vfs_register = Module['_sqlite3_vfs_register'] = wasmExports['qa'])(a0, a1));
    var _sqlite3_vfs_unregister = (Module['_sqlite3_vfs_unregister'] = (a0) =>
      (_sqlite3_vfs_unregister = Module['_sqlite3_vfs_unregister'] = wasmExports['ra'])(a0));
    var _sqlite3_release_memory = (Module['_sqlite3_release_memory'] = (a0) =>
      (_sqlite3_release_memory = Module['_sqlite3_release_memory'] = wasmExports['sa'])(a0));
    var _sqlite3_soft_heap_limit64 = (Module['_sqlite3_soft_heap_limit64'] = (a0, a1) =>
      (_sqlite3_soft_heap_limit64 = Module['_sqlite3_soft_heap_limit64'] = wasmExports['ta'])(a0, a1));
    var _sqlite3_memory_used = (Module['_sqlite3_memory_used'] = () =>
      (_sqlite3_memory_used = Module['_sqlite3_memory_used'] = wasmExports['ua'])());
    var _sqlite3_hard_heap_limit64 = (Module['_sqlite3_hard_heap_limit64'] = (a0, a1) =>
      (_sqlite3_hard_heap_limit64 = Module['_sqlite3_hard_heap_limit64'] = wasmExports['va'])(a0, a1));
    var _sqlite3_memory_highwater = (Module['_sqlite3_memory_highwater'] = (a0) =>
      (_sqlite3_memory_highwater = Module['_sqlite3_memory_highwater'] = wasmExports['wa'])(a0));
    var _sqlite3_malloc = (Module['_sqlite3_malloc'] = (a0) =>
      (_sqlite3_malloc = Module['_sqlite3_malloc'] = wasmExports['xa'])(a0));
    var _sqlite3_malloc64 = (Module['_sqlite3_malloc64'] = (a0, a1) =>
      (_sqlite3_malloc64 = Module['_sqlite3_malloc64'] = wasmExports['ya'])(a0, a1));
    var _sqlite3_free = (Module['_sqlite3_free'] = (a0) =>
      (_sqlite3_free = Module['_sqlite3_free'] = wasmExports['za'])(a0));
    var _sqlite3_realloc = (Module['_sqlite3_realloc'] = (a0, a1) =>
      (_sqlite3_realloc = Module['_sqlite3_realloc'] = wasmExports['Aa'])(a0, a1));
    var _sqlite3_realloc64 = (Module['_sqlite3_realloc64'] = (a0, a1, a2) =>
      (_sqlite3_realloc64 = Module['_sqlite3_realloc64'] = wasmExports['Ba'])(a0, a1, a2));
    var _sqlite3_str_vappendf = (Module['_sqlite3_str_vappendf'] = (a0, a1, a2) =>
      (_sqlite3_str_vappendf = Module['_sqlite3_str_vappendf'] = wasmExports['Ca'])(a0, a1, a2));
    var _sqlite3_str_append = (Module['_sqlite3_str_append'] = (a0, a1, a2) =>
      (_sqlite3_str_append = Module['_sqlite3_str_append'] = wasmExports['Da'])(a0, a1, a2));
    var _sqlite3_str_appendchar = (Module['_sqlite3_str_appendchar'] = (a0, a1, a2) =>
      (_sqlite3_str_appendchar = Module['_sqlite3_str_appendchar'] = wasmExports['Ea'])(a0, a1, a2));
    var _sqlite3_str_appendall = (Module['_sqlite3_str_appendall'] = (a0, a1) =>
      (_sqlite3_str_appendall = Module['_sqlite3_str_appendall'] = wasmExports['Fa'])(a0, a1));
    var _sqlite3_str_appendf = (Module['_sqlite3_str_appendf'] = (a0, a1, a2) =>
      (_sqlite3_str_appendf = Module['_sqlite3_str_appendf'] = wasmExports['Ga'])(a0, a1, a2));
    var _sqlite3_str_finish = (Module['_sqlite3_str_finish'] = (a0) =>
      (_sqlite3_str_finish = Module['_sqlite3_str_finish'] = wasmExports['Ha'])(a0));
    var _sqlite3_str_errcode = (Module['_sqlite3_str_errcode'] = (a0) =>
      (_sqlite3_str_errcode = Module['_sqlite3_str_errcode'] = wasmExports['Ia'])(a0));
    var _sqlite3_str_length = (Module['_sqlite3_str_length'] = (a0) =>
      (_sqlite3_str_length = Module['_sqlite3_str_length'] = wasmExports['Ja'])(a0));
    var _sqlite3_str_value = (Module['_sqlite3_str_value'] = (a0) =>
      (_sqlite3_str_value = Module['_sqlite3_str_value'] = wasmExports['Ka'])(a0));
    var _sqlite3_str_reset = (Module['_sqlite3_str_reset'] = (a0) =>
      (_sqlite3_str_reset = Module['_sqlite3_str_reset'] = wasmExports['La'])(a0));
    var _sqlite3_str_new = (Module['_sqlite3_str_new'] = (a0) =>
      (_sqlite3_str_new = Module['_sqlite3_str_new'] = wasmExports['Ma'])(a0));
    var _sqlite3_vmprintf = (Module['_sqlite3_vmprintf'] = (a0, a1) =>
      (_sqlite3_vmprintf = Module['_sqlite3_vmprintf'] = wasmExports['Na'])(a0, a1));
    var _sqlite3_mprintf = (Module['_sqlite3_mprintf'] = (a0, a1) =>
      (_sqlite3_mprintf = Module['_sqlite3_mprintf'] = wasmExports['Oa'])(a0, a1));
    var _sqlite3_vsnprintf = (Module['_sqlite3_vsnprintf'] = (a0, a1, a2, a3) =>
      (_sqlite3_vsnprintf = Module['_sqlite3_vsnprintf'] = wasmExports['Pa'])(a0, a1, a2, a3));
    var _sqlite3_snprintf = (Module['_sqlite3_snprintf'] = (a0, a1, a2, a3) =>
      (_sqlite3_snprintf = Module['_sqlite3_snprintf'] = wasmExports['Qa'])(a0, a1, a2, a3));
    var _sqlite3_log = (Module['_sqlite3_log'] = (a0, a1, a2) =>
      (_sqlite3_log = Module['_sqlite3_log'] = wasmExports['Ra'])(a0, a1, a2));
    var _sqlite3_randomness = (Module['_sqlite3_randomness'] = (a0, a1) =>
      (_sqlite3_randomness = Module['_sqlite3_randomness'] = wasmExports['Sa'])(a0, a1));
    var _sqlite3_stricmp = (Module['_sqlite3_stricmp'] = (a0, a1) =>
      (_sqlite3_stricmp = Module['_sqlite3_stricmp'] = wasmExports['Ta'])(a0, a1));
    var _sqlite3_strnicmp = (Module['_sqlite3_strnicmp'] = (a0, a1, a2) =>
      (_sqlite3_strnicmp = Module['_sqlite3_strnicmp'] = wasmExports['Ua'])(a0, a1, a2));
    var _sqlite3_os_init = (Module['_sqlite3_os_init'] = () =>
      (_sqlite3_os_init = Module['_sqlite3_os_init'] = wasmExports['Va'])());
    var _sqlite3_os_end = (Module['_sqlite3_os_end'] = () =>
      (_sqlite3_os_end = Module['_sqlite3_os_end'] = wasmExports['Wa'])());
    var _sqlite3_serialize = (Module['_sqlite3_serialize'] = (a0, a1, a2, a3) =>
      (_sqlite3_serialize = Module['_sqlite3_serialize'] = wasmExports['Xa'])(a0, a1, a2, a3));
    var _sqlite3_prepare_v2 = (Module['_sqlite3_prepare_v2'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_prepare_v2 = Module['_sqlite3_prepare_v2'] = wasmExports['Ya'])(a0, a1, a2, a3, a4));
    var _sqlite3_step = (Module['_sqlite3_step'] = (a0) =>
      (_sqlite3_step = Module['_sqlite3_step'] = wasmExports['Za'])(a0));
    var _sqlite3_column_int64 = (Module['_sqlite3_column_int64'] = (a0, a1) =>
      (_sqlite3_column_int64 = Module['_sqlite3_column_int64'] = wasmExports['_a'])(a0, a1));
    var _sqlite3_reset = (Module['_sqlite3_reset'] = (a0) =>
      (_sqlite3_reset = Module['_sqlite3_reset'] = wasmExports['$a'])(a0));
    var _sqlite3_exec = (Module['_sqlite3_exec'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_exec = Module['_sqlite3_exec'] = wasmExports['ab'])(a0, a1, a2, a3, a4));
    var _sqlite3_column_int = (Module['_sqlite3_column_int'] = (a0, a1) =>
      (_sqlite3_column_int = Module['_sqlite3_column_int'] = wasmExports['bb'])(a0, a1));
    var _sqlite3_finalize = (Module['_sqlite3_finalize'] = (a0) =>
      (_sqlite3_finalize = Module['_sqlite3_finalize'] = wasmExports['cb'])(a0));
    var _sqlite3_deserialize = (Module['_sqlite3_deserialize'] = (a0, a1, a2, a3, a4, a5, a6, a7) =>
      (_sqlite3_deserialize = Module['_sqlite3_deserialize'] = wasmExports['db'])(a0, a1, a2, a3, a4, a5, a6, a7));
    var _sqlite3_database_file_object = (Module['_sqlite3_database_file_object'] = (a0) =>
      (_sqlite3_database_file_object = Module['_sqlite3_database_file_object'] = wasmExports['eb'])(a0));
    var _sqlite3_backup_init = (Module['_sqlite3_backup_init'] = (a0, a1, a2, a3) =>
      (_sqlite3_backup_init = Module['_sqlite3_backup_init'] = wasmExports['fb'])(a0, a1, a2, a3));
    var _sqlite3_backup_step = (Module['_sqlite3_backup_step'] = (a0, a1) =>
      (_sqlite3_backup_step = Module['_sqlite3_backup_step'] = wasmExports['gb'])(a0, a1));
    var _sqlite3_backup_finish = (Module['_sqlite3_backup_finish'] = (a0) =>
      (_sqlite3_backup_finish = Module['_sqlite3_backup_finish'] = wasmExports['hb'])(a0));
    var _sqlite3_backup_remaining = (Module['_sqlite3_backup_remaining'] = (a0) =>
      (_sqlite3_backup_remaining = Module['_sqlite3_backup_remaining'] = wasmExports['ib'])(a0));
    var _sqlite3_backup_pagecount = (Module['_sqlite3_backup_pagecount'] = (a0) =>
      (_sqlite3_backup_pagecount = Module['_sqlite3_backup_pagecount'] = wasmExports['jb'])(a0));
    var _sqlite3_clear_bindings = (Module['_sqlite3_clear_bindings'] = (a0) =>
      (_sqlite3_clear_bindings = Module['_sqlite3_clear_bindings'] = wasmExports['kb'])(a0));
    var _sqlite3_value_blob = (Module['_sqlite3_value_blob'] = (a0) =>
      (_sqlite3_value_blob = Module['_sqlite3_value_blob'] = wasmExports['lb'])(a0));
    var _sqlite3_value_text = (Module['_sqlite3_value_text'] = (a0) =>
      (_sqlite3_value_text = Module['_sqlite3_value_text'] = wasmExports['mb'])(a0));
    var _sqlite3_value_bytes = (Module['_sqlite3_value_bytes'] = (a0) =>
      (_sqlite3_value_bytes = Module['_sqlite3_value_bytes'] = wasmExports['nb'])(a0));
    var _sqlite3_value_bytes16 = (Module['_sqlite3_value_bytes16'] = (a0) =>
      (_sqlite3_value_bytes16 = Module['_sqlite3_value_bytes16'] = wasmExports['ob'])(a0));
    var _sqlite3_value_double = (Module['_sqlite3_value_double'] = (a0) =>
      (_sqlite3_value_double = Module['_sqlite3_value_double'] = wasmExports['pb'])(a0));
    var _sqlite3_value_int = (Module['_sqlite3_value_int'] = (a0) =>
      (_sqlite3_value_int = Module['_sqlite3_value_int'] = wasmExports['qb'])(a0));
    var _sqlite3_value_int64 = (Module['_sqlite3_value_int64'] = (a0) =>
      (_sqlite3_value_int64 = Module['_sqlite3_value_int64'] = wasmExports['rb'])(a0));
    var _sqlite3_value_subtype = (Module['_sqlite3_value_subtype'] = (a0) =>
      (_sqlite3_value_subtype = Module['_sqlite3_value_subtype'] = wasmExports['sb'])(a0));
    var _sqlite3_value_pointer = (Module['_sqlite3_value_pointer'] = (a0, a1) =>
      (_sqlite3_value_pointer = Module['_sqlite3_value_pointer'] = wasmExports['tb'])(a0, a1));
    var _sqlite3_value_text16 = (Module['_sqlite3_value_text16'] = (a0) =>
      (_sqlite3_value_text16 = Module['_sqlite3_value_text16'] = wasmExports['ub'])(a0));
    var _sqlite3_value_text16be = (Module['_sqlite3_value_text16be'] = (a0) =>
      (_sqlite3_value_text16be = Module['_sqlite3_value_text16be'] = wasmExports['vb'])(a0));
    var _sqlite3_value_text16le = (Module['_sqlite3_value_text16le'] = (a0) =>
      (_sqlite3_value_text16le = Module['_sqlite3_value_text16le'] = wasmExports['wb'])(a0));
    var _sqlite3_value_type = (Module['_sqlite3_value_type'] = (a0) =>
      (_sqlite3_value_type = Module['_sqlite3_value_type'] = wasmExports['xb'])(a0));
    var _sqlite3_value_encoding = (Module['_sqlite3_value_encoding'] = (a0) =>
      (_sqlite3_value_encoding = Module['_sqlite3_value_encoding'] = wasmExports['yb'])(a0));
    var _sqlite3_value_nochange = (Module['_sqlite3_value_nochange'] = (a0) =>
      (_sqlite3_value_nochange = Module['_sqlite3_value_nochange'] = wasmExports['zb'])(a0));
    var _sqlite3_value_frombind = (Module['_sqlite3_value_frombind'] = (a0) =>
      (_sqlite3_value_frombind = Module['_sqlite3_value_frombind'] = wasmExports['Ab'])(a0));
    var _sqlite3_value_dup = (Module['_sqlite3_value_dup'] = (a0) =>
      (_sqlite3_value_dup = Module['_sqlite3_value_dup'] = wasmExports['Bb'])(a0));
    var _sqlite3_value_free = (Module['_sqlite3_value_free'] = (a0) =>
      (_sqlite3_value_free = Module['_sqlite3_value_free'] = wasmExports['Cb'])(a0));
    var _sqlite3_result_blob = (Module['_sqlite3_result_blob'] = (a0, a1, a2, a3) =>
      (_sqlite3_result_blob = Module['_sqlite3_result_blob'] = wasmExports['Db'])(a0, a1, a2, a3));
    var _sqlite3_result_blob64 = (Module['_sqlite3_result_blob64'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_result_blob64 = Module['_sqlite3_result_blob64'] = wasmExports['Eb'])(a0, a1, a2, a3, a4));
    var _sqlite3_result_double = (Module['_sqlite3_result_double'] = (a0, a1) =>
      (_sqlite3_result_double = Module['_sqlite3_result_double'] = wasmExports['Fb'])(a0, a1));
    var _sqlite3_result_error = (Module['_sqlite3_result_error'] = (a0, a1, a2) =>
      (_sqlite3_result_error = Module['_sqlite3_result_error'] = wasmExports['Gb'])(a0, a1, a2));
    var _sqlite3_result_error16 = (Module['_sqlite3_result_error16'] = (a0, a1, a2) =>
      (_sqlite3_result_error16 = Module['_sqlite3_result_error16'] = wasmExports['Hb'])(a0, a1, a2));
    var _sqlite3_result_int = (Module['_sqlite3_result_int'] = (a0, a1) =>
      (_sqlite3_result_int = Module['_sqlite3_result_int'] = wasmExports['Ib'])(a0, a1));
    var _sqlite3_result_int64 = (Module['_sqlite3_result_int64'] = (a0, a1, a2) =>
      (_sqlite3_result_int64 = Module['_sqlite3_result_int64'] = wasmExports['Jb'])(a0, a1, a2));
    var _sqlite3_result_null = (Module['_sqlite3_result_null'] = (a0) =>
      (_sqlite3_result_null = Module['_sqlite3_result_null'] = wasmExports['Kb'])(a0));
    var _sqlite3_result_pointer = (Module['_sqlite3_result_pointer'] = (a0, a1, a2, a3) =>
      (_sqlite3_result_pointer = Module['_sqlite3_result_pointer'] = wasmExports['Lb'])(a0, a1, a2, a3));
    var _sqlite3_result_subtype = (Module['_sqlite3_result_subtype'] = (a0, a1) =>
      (_sqlite3_result_subtype = Module['_sqlite3_result_subtype'] = wasmExports['Mb'])(a0, a1));
    var _sqlite3_result_text = (Module['_sqlite3_result_text'] = (a0, a1, a2, a3) =>
      (_sqlite3_result_text = Module['_sqlite3_result_text'] = wasmExports['Nb'])(a0, a1, a2, a3));
    var _sqlite3_result_text64 = (Module['_sqlite3_result_text64'] = (a0, a1, a2, a3, a4, a5) =>
      (_sqlite3_result_text64 = Module['_sqlite3_result_text64'] = wasmExports['Ob'])(a0, a1, a2, a3, a4, a5));
    var _sqlite3_result_text16 = (Module['_sqlite3_result_text16'] = (a0, a1, a2, a3) =>
      (_sqlite3_result_text16 = Module['_sqlite3_result_text16'] = wasmExports['Pb'])(a0, a1, a2, a3));
    var _sqlite3_result_text16be = (Module['_sqlite3_result_text16be'] = (a0, a1, a2, a3) =>
      (_sqlite3_result_text16be = Module['_sqlite3_result_text16be'] = wasmExports['Qb'])(a0, a1, a2, a3));
    var _sqlite3_result_text16le = (Module['_sqlite3_result_text16le'] = (a0, a1, a2, a3) =>
      (_sqlite3_result_text16le = Module['_sqlite3_result_text16le'] = wasmExports['Rb'])(a0, a1, a2, a3));
    var _sqlite3_result_value = (Module['_sqlite3_result_value'] = (a0, a1) =>
      (_sqlite3_result_value = Module['_sqlite3_result_value'] = wasmExports['Sb'])(a0, a1));
    var _sqlite3_result_error_toobig = (Module['_sqlite3_result_error_toobig'] = (a0) =>
      (_sqlite3_result_error_toobig = Module['_sqlite3_result_error_toobig'] = wasmExports['Tb'])(a0));
    var _sqlite3_result_zeroblob = (Module['_sqlite3_result_zeroblob'] = (a0, a1) =>
      (_sqlite3_result_zeroblob = Module['_sqlite3_result_zeroblob'] = wasmExports['Ub'])(a0, a1));
    var _sqlite3_result_zeroblob64 = (Module['_sqlite3_result_zeroblob64'] = (a0, a1, a2) =>
      (_sqlite3_result_zeroblob64 = Module['_sqlite3_result_zeroblob64'] = wasmExports['Vb'])(a0, a1, a2));
    var _sqlite3_result_error_code = (Module['_sqlite3_result_error_code'] = (a0, a1) =>
      (_sqlite3_result_error_code = Module['_sqlite3_result_error_code'] = wasmExports['Wb'])(a0, a1));
    var _sqlite3_result_error_nomem = (Module['_sqlite3_result_error_nomem'] = (a0) =>
      (_sqlite3_result_error_nomem = Module['_sqlite3_result_error_nomem'] = wasmExports['Xb'])(a0));
    var _sqlite3_user_data = (Module['_sqlite3_user_data'] = (a0) =>
      (_sqlite3_user_data = Module['_sqlite3_user_data'] = wasmExports['Yb'])(a0));
    var _sqlite3_context_db_handle = (Module['_sqlite3_context_db_handle'] = (a0) =>
      (_sqlite3_context_db_handle = Module['_sqlite3_context_db_handle'] = wasmExports['Zb'])(a0));
    var _sqlite3_vtab_nochange = (Module['_sqlite3_vtab_nochange'] = (a0) =>
      (_sqlite3_vtab_nochange = Module['_sqlite3_vtab_nochange'] = wasmExports['_b'])(a0));
    var _sqlite3_vtab_in_first = (Module['_sqlite3_vtab_in_first'] = (a0, a1) =>
      (_sqlite3_vtab_in_first = Module['_sqlite3_vtab_in_first'] = wasmExports['$b'])(a0, a1));
    var _sqlite3_vtab_in_next = (Module['_sqlite3_vtab_in_next'] = (a0, a1) =>
      (_sqlite3_vtab_in_next = Module['_sqlite3_vtab_in_next'] = wasmExports['ac'])(a0, a1));
    var _sqlite3_aggregate_context = (Module['_sqlite3_aggregate_context'] = (a0, a1) =>
      (_sqlite3_aggregate_context = Module['_sqlite3_aggregate_context'] = wasmExports['bc'])(a0, a1));
    var _sqlite3_get_auxdata = (Module['_sqlite3_get_auxdata'] = (a0, a1) =>
      (_sqlite3_get_auxdata = Module['_sqlite3_get_auxdata'] = wasmExports['cc'])(a0, a1));
    var _sqlite3_set_auxdata = (Module['_sqlite3_set_auxdata'] = (a0, a1, a2, a3) =>
      (_sqlite3_set_auxdata = Module['_sqlite3_set_auxdata'] = wasmExports['dc'])(a0, a1, a2, a3));
    var _sqlite3_column_count = (Module['_sqlite3_column_count'] = (a0) =>
      (_sqlite3_column_count = Module['_sqlite3_column_count'] = wasmExports['ec'])(a0));
    var _sqlite3_data_count = (Module['_sqlite3_data_count'] = (a0) =>
      (_sqlite3_data_count = Module['_sqlite3_data_count'] = wasmExports['fc'])(a0));
    var _sqlite3_column_blob = (Module['_sqlite3_column_blob'] = (a0, a1) =>
      (_sqlite3_column_blob = Module['_sqlite3_column_blob'] = wasmExports['gc'])(a0, a1));
    var _sqlite3_column_bytes = (Module['_sqlite3_column_bytes'] = (a0, a1) =>
      (_sqlite3_column_bytes = Module['_sqlite3_column_bytes'] = wasmExports['hc'])(a0, a1));
    var _sqlite3_column_bytes16 = (Module['_sqlite3_column_bytes16'] = (a0, a1) =>
      (_sqlite3_column_bytes16 = Module['_sqlite3_column_bytes16'] = wasmExports['ic'])(a0, a1));
    var _sqlite3_column_double = (Module['_sqlite3_column_double'] = (a0, a1) =>
      (_sqlite3_column_double = Module['_sqlite3_column_double'] = wasmExports['jc'])(a0, a1));
    var _sqlite3_column_text = (Module['_sqlite3_column_text'] = (a0, a1) =>
      (_sqlite3_column_text = Module['_sqlite3_column_text'] = wasmExports['kc'])(a0, a1));
    var _sqlite3_column_value = (Module['_sqlite3_column_value'] = (a0, a1) =>
      (_sqlite3_column_value = Module['_sqlite3_column_value'] = wasmExports['lc'])(a0, a1));
    var _sqlite3_column_text16 = (Module['_sqlite3_column_text16'] = (a0, a1) =>
      (_sqlite3_column_text16 = Module['_sqlite3_column_text16'] = wasmExports['mc'])(a0, a1));
    var _sqlite3_column_type = (Module['_sqlite3_column_type'] = (a0, a1) =>
      (_sqlite3_column_type = Module['_sqlite3_column_type'] = wasmExports['nc'])(a0, a1));
    var _sqlite3_column_name = (Module['_sqlite3_column_name'] = (a0, a1) =>
      (_sqlite3_column_name = Module['_sqlite3_column_name'] = wasmExports['oc'])(a0, a1));
    var _sqlite3_column_name16 = (Module['_sqlite3_column_name16'] = (a0, a1) =>
      (_sqlite3_column_name16 = Module['_sqlite3_column_name16'] = wasmExports['pc'])(a0, a1));
    var _sqlite3_bind_blob = (Module['_sqlite3_bind_blob'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_bind_blob = Module['_sqlite3_bind_blob'] = wasmExports['qc'])(a0, a1, a2, a3, a4));
    var _sqlite3_bind_blob64 = (Module['_sqlite3_bind_blob64'] = (a0, a1, a2, a3, a4, a5) =>
      (_sqlite3_bind_blob64 = Module['_sqlite3_bind_blob64'] = wasmExports['rc'])(a0, a1, a2, a3, a4, a5));
    var _sqlite3_bind_double = (Module['_sqlite3_bind_double'] = (a0, a1, a2) =>
      (_sqlite3_bind_double = Module['_sqlite3_bind_double'] = wasmExports['sc'])(a0, a1, a2));
    var _sqlite3_bind_int = (Module['_sqlite3_bind_int'] = (a0, a1, a2) =>
      (_sqlite3_bind_int = Module['_sqlite3_bind_int'] = wasmExports['tc'])(a0, a1, a2));
    var _sqlite3_bind_int64 = (Module['_sqlite3_bind_int64'] = (a0, a1, a2, a3) =>
      (_sqlite3_bind_int64 = Module['_sqlite3_bind_int64'] = wasmExports['uc'])(a0, a1, a2, a3));
    var _sqlite3_bind_null = (Module['_sqlite3_bind_null'] = (a0, a1) =>
      (_sqlite3_bind_null = Module['_sqlite3_bind_null'] = wasmExports['vc'])(a0, a1));
    var _sqlite3_bind_pointer = (Module['_sqlite3_bind_pointer'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_bind_pointer = Module['_sqlite3_bind_pointer'] = wasmExports['wc'])(a0, a1, a2, a3, a4));
    var _sqlite3_bind_text = (Module['_sqlite3_bind_text'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_bind_text = Module['_sqlite3_bind_text'] = wasmExports['xc'])(a0, a1, a2, a3, a4));
    var _sqlite3_bind_text64 = (Module['_sqlite3_bind_text64'] = (a0, a1, a2, a3, a4, a5, a6) =>
      (_sqlite3_bind_text64 = Module['_sqlite3_bind_text64'] = wasmExports['yc'])(a0, a1, a2, a3, a4, a5, a6));
    var _sqlite3_bind_text16 = (Module['_sqlite3_bind_text16'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_bind_text16 = Module['_sqlite3_bind_text16'] = wasmExports['zc'])(a0, a1, a2, a3, a4));
    var _sqlite3_bind_value = (Module['_sqlite3_bind_value'] = (a0, a1, a2) =>
      (_sqlite3_bind_value = Module['_sqlite3_bind_value'] = wasmExports['Ac'])(a0, a1, a2));
    var _sqlite3_bind_zeroblob = (Module['_sqlite3_bind_zeroblob'] = (a0, a1, a2) =>
      (_sqlite3_bind_zeroblob = Module['_sqlite3_bind_zeroblob'] = wasmExports['Bc'])(a0, a1, a2));
    var _sqlite3_bind_zeroblob64 = (Module['_sqlite3_bind_zeroblob64'] = (a0, a1, a2, a3) =>
      (_sqlite3_bind_zeroblob64 = Module['_sqlite3_bind_zeroblob64'] = wasmExports['Cc'])(a0, a1, a2, a3));
    var _sqlite3_bind_parameter_count = (Module['_sqlite3_bind_parameter_count'] = (a0) =>
      (_sqlite3_bind_parameter_count = Module['_sqlite3_bind_parameter_count'] = wasmExports['Dc'])(a0));
    var _sqlite3_bind_parameter_name = (Module['_sqlite3_bind_parameter_name'] = (a0, a1) =>
      (_sqlite3_bind_parameter_name = Module['_sqlite3_bind_parameter_name'] = wasmExports['Ec'])(a0, a1));
    var _sqlite3_bind_parameter_index = (Module['_sqlite3_bind_parameter_index'] = (a0, a1) =>
      (_sqlite3_bind_parameter_index = Module['_sqlite3_bind_parameter_index'] = wasmExports['Fc'])(a0, a1));
    var _sqlite3_db_handle = (Module['_sqlite3_db_handle'] = (a0) =>
      (_sqlite3_db_handle = Module['_sqlite3_db_handle'] = wasmExports['Gc'])(a0));
    var _sqlite3_stmt_readonly = (Module['_sqlite3_stmt_readonly'] = (a0) =>
      (_sqlite3_stmt_readonly = Module['_sqlite3_stmt_readonly'] = wasmExports['Hc'])(a0));
    var _sqlite3_stmt_isexplain = (Module['_sqlite3_stmt_isexplain'] = (a0) =>
      (_sqlite3_stmt_isexplain = Module['_sqlite3_stmt_isexplain'] = wasmExports['Ic'])(a0));
    var _sqlite3_stmt_explain = (Module['_sqlite3_stmt_explain'] = (a0, a1) =>
      (_sqlite3_stmt_explain = Module['_sqlite3_stmt_explain'] = wasmExports['Jc'])(a0, a1));
    var _sqlite3_stmt_busy = (Module['_sqlite3_stmt_busy'] = (a0) =>
      (_sqlite3_stmt_busy = Module['_sqlite3_stmt_busy'] = wasmExports['Kc'])(a0));
    var _sqlite3_next_stmt = (Module['_sqlite3_next_stmt'] = (a0, a1) =>
      (_sqlite3_next_stmt = Module['_sqlite3_next_stmt'] = wasmExports['Lc'])(a0, a1));
    var _sqlite3_stmt_status = (Module['_sqlite3_stmt_status'] = (a0, a1, a2) =>
      (_sqlite3_stmt_status = Module['_sqlite3_stmt_status'] = wasmExports['Mc'])(a0, a1, a2));
    var _sqlite3_sql = (Module['_sqlite3_sql'] = (a0) =>
      (_sqlite3_sql = Module['_sqlite3_sql'] = wasmExports['Nc'])(a0));
    var _sqlite3_expanded_sql = (Module['_sqlite3_expanded_sql'] = (a0) =>
      (_sqlite3_expanded_sql = Module['_sqlite3_expanded_sql'] = wasmExports['Oc'])(a0));
    var _sqlite3_value_numeric_type = (Module['_sqlite3_value_numeric_type'] = (a0) =>
      (_sqlite3_value_numeric_type = Module['_sqlite3_value_numeric_type'] = wasmExports['Pc'])(a0));
    var _sqlite3_blob_open = (Module['_sqlite3_blob_open'] = (a0, a1, a2, a3, a4, a5, a6, a7) =>
      (_sqlite3_blob_open = Module['_sqlite3_blob_open'] = wasmExports['Qc'])(a0, a1, a2, a3, a4, a5, a6, a7));
    var _sqlite3_blob_close = (Module['_sqlite3_blob_close'] = (a0) =>
      (_sqlite3_blob_close = Module['_sqlite3_blob_close'] = wasmExports['Rc'])(a0));
    var _sqlite3_blob_read = (Module['_sqlite3_blob_read'] = (a0, a1, a2, a3) =>
      (_sqlite3_blob_read = Module['_sqlite3_blob_read'] = wasmExports['Sc'])(a0, a1, a2, a3));
    var _sqlite3_blob_write = (Module['_sqlite3_blob_write'] = (a0, a1, a2, a3) =>
      (_sqlite3_blob_write = Module['_sqlite3_blob_write'] = wasmExports['Tc'])(a0, a1, a2, a3));
    var _sqlite3_blob_bytes = (Module['_sqlite3_blob_bytes'] = (a0) =>
      (_sqlite3_blob_bytes = Module['_sqlite3_blob_bytes'] = wasmExports['Uc'])(a0));
    var _sqlite3_blob_reopen = (Module['_sqlite3_blob_reopen'] = (a0, a1, a2) =>
      (_sqlite3_blob_reopen = Module['_sqlite3_blob_reopen'] = wasmExports['Vc'])(a0, a1, a2));
    var _sqlite3_set_authorizer = (Module['_sqlite3_set_authorizer'] = (a0, a1, a2) =>
      (_sqlite3_set_authorizer = Module['_sqlite3_set_authorizer'] = wasmExports['Wc'])(a0, a1, a2));
    var _sqlite3_strglob = (Module['_sqlite3_strglob'] = (a0, a1) =>
      (_sqlite3_strglob = Module['_sqlite3_strglob'] = wasmExports['Xc'])(a0, a1));
    var _sqlite3_strlike = (Module['_sqlite3_strlike'] = (a0, a1, a2) =>
      (_sqlite3_strlike = Module['_sqlite3_strlike'] = wasmExports['Yc'])(a0, a1, a2));
    var _sqlite3_errmsg = (Module['_sqlite3_errmsg'] = (a0) =>
      (_sqlite3_errmsg = Module['_sqlite3_errmsg'] = wasmExports['Zc'])(a0));
    var _sqlite3_auto_extension = (Module['_sqlite3_auto_extension'] = (a0) =>
      (_sqlite3_auto_extension = Module['_sqlite3_auto_extension'] = wasmExports['_c'])(a0));
    var _sqlite3_cancel_auto_extension = (Module['_sqlite3_cancel_auto_extension'] = (a0) =>
      (_sqlite3_cancel_auto_extension = Module['_sqlite3_cancel_auto_extension'] = wasmExports['$c'])(a0));
    var _sqlite3_reset_auto_extension = (Module['_sqlite3_reset_auto_extension'] = () =>
      (_sqlite3_reset_auto_extension = Module['_sqlite3_reset_auto_extension'] = wasmExports['ad'])());
    var _sqlite3_prepare = (Module['_sqlite3_prepare'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_prepare = Module['_sqlite3_prepare'] = wasmExports['bd'])(a0, a1, a2, a3, a4));
    var _sqlite3_prepare_v3 = (Module['_sqlite3_prepare_v3'] = (a0, a1, a2, a3, a4, a5) =>
      (_sqlite3_prepare_v3 = Module['_sqlite3_prepare_v3'] = wasmExports['cd'])(a0, a1, a2, a3, a4, a5));
    var _sqlite3_prepare16 = (Module['_sqlite3_prepare16'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_prepare16 = Module['_sqlite3_prepare16'] = wasmExports['dd'])(a0, a1, a2, a3, a4));
    var _sqlite3_prepare16_v2 = (Module['_sqlite3_prepare16_v2'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_prepare16_v2 = Module['_sqlite3_prepare16_v2'] = wasmExports['ed'])(a0, a1, a2, a3, a4));
    var _sqlite3_prepare16_v3 = (Module['_sqlite3_prepare16_v3'] = (a0, a1, a2, a3, a4, a5) =>
      (_sqlite3_prepare16_v3 = Module['_sqlite3_prepare16_v3'] = wasmExports['fd'])(a0, a1, a2, a3, a4, a5));
    var _sqlite3_get_table = (Module['_sqlite3_get_table'] = (a0, a1, a2, a3, a4, a5) =>
      (_sqlite3_get_table = Module['_sqlite3_get_table'] = wasmExports['gd'])(a0, a1, a2, a3, a4, a5));
    var _sqlite3_free_table = (Module['_sqlite3_free_table'] = (a0) =>
      (_sqlite3_free_table = Module['_sqlite3_free_table'] = wasmExports['hd'])(a0));
    var _sqlite3_create_module = (Module['_sqlite3_create_module'] = (a0, a1, a2, a3) =>
      (_sqlite3_create_module = Module['_sqlite3_create_module'] = wasmExports['id'])(a0, a1, a2, a3));
    var _sqlite3_create_module_v2 = (Module['_sqlite3_create_module_v2'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_create_module_v2 = Module['_sqlite3_create_module_v2'] = wasmExports['jd'])(a0, a1, a2, a3, a4));
    var _sqlite3_drop_modules = (Module['_sqlite3_drop_modules'] = (a0, a1) =>
      (_sqlite3_drop_modules = Module['_sqlite3_drop_modules'] = wasmExports['kd'])(a0, a1));
    var _sqlite3_declare_vtab = (Module['_sqlite3_declare_vtab'] = (a0, a1) =>
      (_sqlite3_declare_vtab = Module['_sqlite3_declare_vtab'] = wasmExports['ld'])(a0, a1));
    var _sqlite3_vtab_on_conflict = (Module['_sqlite3_vtab_on_conflict'] = (a0) =>
      (_sqlite3_vtab_on_conflict = Module['_sqlite3_vtab_on_conflict'] = wasmExports['md'])(a0));
    var _sqlite3_vtab_config = (Module['_sqlite3_vtab_config'] = (a0, a1, a2) =>
      (_sqlite3_vtab_config = Module['_sqlite3_vtab_config'] = wasmExports['nd'])(a0, a1, a2));
    var _sqlite3_vtab_collation = (Module['_sqlite3_vtab_collation'] = (a0, a1) =>
      (_sqlite3_vtab_collation = Module['_sqlite3_vtab_collation'] = wasmExports['od'])(a0, a1));
    var _sqlite3_vtab_in = (Module['_sqlite3_vtab_in'] = (a0, a1, a2) =>
      (_sqlite3_vtab_in = Module['_sqlite3_vtab_in'] = wasmExports['pd'])(a0, a1, a2));
    var _sqlite3_vtab_rhs_value = (Module['_sqlite3_vtab_rhs_value'] = (a0, a1, a2) =>
      (_sqlite3_vtab_rhs_value = Module['_sqlite3_vtab_rhs_value'] = wasmExports['qd'])(a0, a1, a2));
    var _sqlite3_vtab_distinct = (Module['_sqlite3_vtab_distinct'] = (a0) =>
      (_sqlite3_vtab_distinct = Module['_sqlite3_vtab_distinct'] = wasmExports['rd'])(a0));
    var _sqlite3_keyword_name = (Module['_sqlite3_keyword_name'] = (a0, a1, a2) =>
      (_sqlite3_keyword_name = Module['_sqlite3_keyword_name'] = wasmExports['sd'])(a0, a1, a2));
    var _sqlite3_keyword_count = (Module['_sqlite3_keyword_count'] = () =>
      (_sqlite3_keyword_count = Module['_sqlite3_keyword_count'] = wasmExports['td'])());
    var _sqlite3_keyword_check = (Module['_sqlite3_keyword_check'] = (a0, a1) =>
      (_sqlite3_keyword_check = Module['_sqlite3_keyword_check'] = wasmExports['ud'])(a0, a1));
    var _sqlite3_complete = (Module['_sqlite3_complete'] = (a0) =>
      (_sqlite3_complete = Module['_sqlite3_complete'] = wasmExports['vd'])(a0));
    var _sqlite3_complete16 = (Module['_sqlite3_complete16'] = (a0) =>
      (_sqlite3_complete16 = Module['_sqlite3_complete16'] = wasmExports['wd'])(a0));
    var _sqlite3_libversion = (Module['_sqlite3_libversion'] = () =>
      (_sqlite3_libversion = Module['_sqlite3_libversion'] = wasmExports['xd'])());
    var _sqlite3_libversion_number = (Module['_sqlite3_libversion_number'] = () =>
      (_sqlite3_libversion_number = Module['_sqlite3_libversion_number'] = wasmExports['yd'])());
    var _sqlite3_threadsafe = (Module['_sqlite3_threadsafe'] = () =>
      (_sqlite3_threadsafe = Module['_sqlite3_threadsafe'] = wasmExports['zd'])());
    var _sqlite3_initialize = (Module['_sqlite3_initialize'] = () =>
      (_sqlite3_initialize = Module['_sqlite3_initialize'] = wasmExports['Ad'])());
    var _sqlite3_shutdown = (Module['_sqlite3_shutdown'] = () =>
      (_sqlite3_shutdown = Module['_sqlite3_shutdown'] = wasmExports['Bd'])());
    var _sqlite3_config = (Module['_sqlite3_config'] = (a0, a1) =>
      (_sqlite3_config = Module['_sqlite3_config'] = wasmExports['Cd'])(a0, a1));
    var _sqlite3_db_mutex = (Module['_sqlite3_db_mutex'] = (a0) =>
      (_sqlite3_db_mutex = Module['_sqlite3_db_mutex'] = wasmExports['Dd'])(a0));
    var _sqlite3_db_release_memory = (Module['_sqlite3_db_release_memory'] = (a0) =>
      (_sqlite3_db_release_memory = Module['_sqlite3_db_release_memory'] = wasmExports['Ed'])(a0));
    var _sqlite3_db_cacheflush = (Module['_sqlite3_db_cacheflush'] = (a0) =>
      (_sqlite3_db_cacheflush = Module['_sqlite3_db_cacheflush'] = wasmExports['Fd'])(a0));
    var _sqlite3_db_config = (Module['_sqlite3_db_config'] = (a0, a1, a2) =>
      (_sqlite3_db_config = Module['_sqlite3_db_config'] = wasmExports['Gd'])(a0, a1, a2));
    var _sqlite3_last_insert_rowid = (Module['_sqlite3_last_insert_rowid'] = (a0) =>
      (_sqlite3_last_insert_rowid = Module['_sqlite3_last_insert_rowid'] = wasmExports['Hd'])(a0));
    var _sqlite3_set_last_insert_rowid = (Module['_sqlite3_set_last_insert_rowid'] = (a0, a1, a2) =>
      (_sqlite3_set_last_insert_rowid = Module['_sqlite3_set_last_insert_rowid'] = wasmExports['Id'])(a0, a1, a2));
    var _sqlite3_changes64 = (Module['_sqlite3_changes64'] = (a0) =>
      (_sqlite3_changes64 = Module['_sqlite3_changes64'] = wasmExports['Jd'])(a0));
    var _sqlite3_changes = (Module['_sqlite3_changes'] = (a0) =>
      (_sqlite3_changes = Module['_sqlite3_changes'] = wasmExports['Kd'])(a0));
    var _sqlite3_total_changes64 = (Module['_sqlite3_total_changes64'] = (a0) =>
      (_sqlite3_total_changes64 = Module['_sqlite3_total_changes64'] = wasmExports['Ld'])(a0));
    var _sqlite3_total_changes = (Module['_sqlite3_total_changes'] = (a0) =>
      (_sqlite3_total_changes = Module['_sqlite3_total_changes'] = wasmExports['Md'])(a0));
    var _sqlite3_txn_state = (Module['_sqlite3_txn_state'] = (a0, a1) =>
      (_sqlite3_txn_state = Module['_sqlite3_txn_state'] = wasmExports['Nd'])(a0, a1));
    var _sqlite3_close = (Module['_sqlite3_close'] = (a0) =>
      (_sqlite3_close = Module['_sqlite3_close'] = wasmExports['Od'])(a0));
    var _sqlite3_close_v2 = (Module['_sqlite3_close_v2'] = (a0) =>
      (_sqlite3_close_v2 = Module['_sqlite3_close_v2'] = wasmExports['Pd'])(a0));
    var _sqlite3_busy_handler = (Module['_sqlite3_busy_handler'] = (a0, a1, a2) =>
      (_sqlite3_busy_handler = Module['_sqlite3_busy_handler'] = wasmExports['Qd'])(a0, a1, a2));
    var _sqlite3_progress_handler = (Module['_sqlite3_progress_handler'] = (a0, a1, a2, a3) =>
      (_sqlite3_progress_handler = Module['_sqlite3_progress_handler'] = wasmExports['Rd'])(a0, a1, a2, a3));
    var _sqlite3_busy_timeout = (Module['_sqlite3_busy_timeout'] = (a0, a1) =>
      (_sqlite3_busy_timeout = Module['_sqlite3_busy_timeout'] = wasmExports['Sd'])(a0, a1));
    var _sqlite3_interrupt = (Module['_sqlite3_interrupt'] = (a0) =>
      (_sqlite3_interrupt = Module['_sqlite3_interrupt'] = wasmExports['Td'])(a0));
    var _sqlite3_is_interrupted = (Module['_sqlite3_is_interrupted'] = (a0) =>
      (_sqlite3_is_interrupted = Module['_sqlite3_is_interrupted'] = wasmExports['Ud'])(a0));
    var _sqlite3_create_function = (Module['_sqlite3_create_function'] = (a0, a1, a2, a3, a4, a5, a6, a7) =>
      (_sqlite3_create_function = Module['_sqlite3_create_function'] = wasmExports['Vd'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7
      ));
    var _sqlite3_create_function_v2 = (Module['_sqlite3_create_function_v2'] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) =>
      (_sqlite3_create_function_v2 = Module['_sqlite3_create_function_v2'] = wasmExports['Wd'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8
      ));
    var _sqlite3_create_window_function = (Module['_sqlite3_create_window_function'] = (
      a0,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8,
      a9
    ) =>
      (_sqlite3_create_window_function = Module['_sqlite3_create_window_function'] = wasmExports['Xd'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8,
        a9
      ));
    var _sqlite3_create_function16 = (Module['_sqlite3_create_function16'] = (a0, a1, a2, a3, a4, a5, a6, a7) =>
      (_sqlite3_create_function16 = Module['_sqlite3_create_function16'] = wasmExports['Yd'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7
      ));
    var _sqlite3_overload_function = (Module['_sqlite3_overload_function'] = (a0, a1, a2) =>
      (_sqlite3_overload_function = Module['_sqlite3_overload_function'] = wasmExports['Zd'])(a0, a1, a2));
    var _sqlite3_trace_v2 = (Module['_sqlite3_trace_v2'] = (a0, a1, a2, a3) =>
      (_sqlite3_trace_v2 = Module['_sqlite3_trace_v2'] = wasmExports['_d'])(a0, a1, a2, a3));
    var _sqlite3_commit_hook = (Module['_sqlite3_commit_hook'] = (a0, a1, a2) =>
      (_sqlite3_commit_hook = Module['_sqlite3_commit_hook'] = wasmExports['$d'])(a0, a1, a2));
    var _sqlite3_update_hook = (Module['_sqlite3_update_hook'] = (a0, a1, a2) =>
      (_sqlite3_update_hook = Module['_sqlite3_update_hook'] = wasmExports['ae'])(a0, a1, a2));
    var _sqlite3_rollback_hook = (Module['_sqlite3_rollback_hook'] = (a0, a1, a2) =>
      (_sqlite3_rollback_hook = Module['_sqlite3_rollback_hook'] = wasmExports['be'])(a0, a1, a2));
    var _sqlite3_autovacuum_pages = (Module['_sqlite3_autovacuum_pages'] = (a0, a1, a2, a3) =>
      (_sqlite3_autovacuum_pages = Module['_sqlite3_autovacuum_pages'] = wasmExports['ce'])(a0, a1, a2, a3));
    var _sqlite3_wal_autocheckpoint = (Module['_sqlite3_wal_autocheckpoint'] = (a0, a1) =>
      (_sqlite3_wal_autocheckpoint = Module['_sqlite3_wal_autocheckpoint'] = wasmExports['de'])(a0, a1));
    var _sqlite3_wal_hook = (Module['_sqlite3_wal_hook'] = (a0, a1, a2) =>
      (_sqlite3_wal_hook = Module['_sqlite3_wal_hook'] = wasmExports['ee'])(a0, a1, a2));
    var _sqlite3_wal_checkpoint_v2 = (Module['_sqlite3_wal_checkpoint_v2'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_wal_checkpoint_v2 = Module['_sqlite3_wal_checkpoint_v2'] = wasmExports['fe'])(a0, a1, a2, a3, a4));
    var _sqlite3_wal_checkpoint = (Module['_sqlite3_wal_checkpoint'] = (a0, a1) =>
      (_sqlite3_wal_checkpoint = Module['_sqlite3_wal_checkpoint'] = wasmExports['ge'])(a0, a1));
    var _sqlite3_error_offset = (Module['_sqlite3_error_offset'] = (a0) =>
      (_sqlite3_error_offset = Module['_sqlite3_error_offset'] = wasmExports['he'])(a0));
    var _sqlite3_errmsg16 = (Module['_sqlite3_errmsg16'] = (a0) =>
      (_sqlite3_errmsg16 = Module['_sqlite3_errmsg16'] = wasmExports['ie'])(a0));
    var _sqlite3_errcode = (Module['_sqlite3_errcode'] = (a0) =>
      (_sqlite3_errcode = Module['_sqlite3_errcode'] = wasmExports['je'])(a0));
    var _sqlite3_extended_errcode = (Module['_sqlite3_extended_errcode'] = (a0) =>
      (_sqlite3_extended_errcode = Module['_sqlite3_extended_errcode'] = wasmExports['ke'])(a0));
    var _sqlite3_system_errno = (Module['_sqlite3_system_errno'] = (a0) =>
      (_sqlite3_system_errno = Module['_sqlite3_system_errno'] = wasmExports['le'])(a0));
    var _sqlite3_errstr = (Module['_sqlite3_errstr'] = (a0) =>
      (_sqlite3_errstr = Module['_sqlite3_errstr'] = wasmExports['me'])(a0));
    var _sqlite3_limit = (Module['_sqlite3_limit'] = (a0, a1, a2) =>
      (_sqlite3_limit = Module['_sqlite3_limit'] = wasmExports['ne'])(a0, a1, a2));
    var _sqlite3_open = (Module['_sqlite3_open'] = (a0, a1) =>
      (_sqlite3_open = Module['_sqlite3_open'] = wasmExports['oe'])(a0, a1));
    var _sqlite3_open_v2 = (Module['_sqlite3_open_v2'] = (a0, a1, a2, a3) =>
      (_sqlite3_open_v2 = Module['_sqlite3_open_v2'] = wasmExports['pe'])(a0, a1, a2, a3));
    var _sqlite3_open16 = (Module['_sqlite3_open16'] = (a0, a1) =>
      (_sqlite3_open16 = Module['_sqlite3_open16'] = wasmExports['qe'])(a0, a1));
    var _sqlite3_create_collation = (Module['_sqlite3_create_collation'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_create_collation = Module['_sqlite3_create_collation'] = wasmExports['re'])(a0, a1, a2, a3, a4));
    var _sqlite3_create_collation_v2 = (Module['_sqlite3_create_collation_v2'] = (a0, a1, a2, a3, a4, a5) =>
      (_sqlite3_create_collation_v2 = Module['_sqlite3_create_collation_v2'] = wasmExports['se'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5
      ));
    var _sqlite3_create_collation16 = (Module['_sqlite3_create_collation16'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_create_collation16 = Module['_sqlite3_create_collation16'] = wasmExports['te'])(a0, a1, a2, a3, a4));
    var _sqlite3_collation_needed = (Module['_sqlite3_collation_needed'] = (a0, a1, a2) =>
      (_sqlite3_collation_needed = Module['_sqlite3_collation_needed'] = wasmExports['ue'])(a0, a1, a2));
    var _sqlite3_collation_needed16 = (Module['_sqlite3_collation_needed16'] = (a0, a1, a2) =>
      (_sqlite3_collation_needed16 = Module['_sqlite3_collation_needed16'] = wasmExports['ve'])(a0, a1, a2));
    var _sqlite3_get_clientdata = (Module['_sqlite3_get_clientdata'] = (a0, a1) =>
      (_sqlite3_get_clientdata = Module['_sqlite3_get_clientdata'] = wasmExports['we'])(a0, a1));
    var _sqlite3_set_clientdata = (Module['_sqlite3_set_clientdata'] = (a0, a1, a2, a3) =>
      (_sqlite3_set_clientdata = Module['_sqlite3_set_clientdata'] = wasmExports['xe'])(a0, a1, a2, a3));
    var _sqlite3_get_autocommit = (Module['_sqlite3_get_autocommit'] = (a0) =>
      (_sqlite3_get_autocommit = Module['_sqlite3_get_autocommit'] = wasmExports['ye'])(a0));
    var _sqlite3_table_column_metadata = (Module['_sqlite3_table_column_metadata'] = (
      a0,
      a1,
      a2,
      a3,
      a4,
      a5,
      a6,
      a7,
      a8
    ) =>
      (_sqlite3_table_column_metadata = Module['_sqlite3_table_column_metadata'] = wasmExports['ze'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7,
        a8
      ));
    var _sqlite3_sleep = (Module['_sqlite3_sleep'] = (a0) =>
      (_sqlite3_sleep = Module['_sqlite3_sleep'] = wasmExports['Ae'])(a0));
    var _sqlite3_extended_result_codes = (Module['_sqlite3_extended_result_codes'] = (a0, a1) =>
      (_sqlite3_extended_result_codes = Module['_sqlite3_extended_result_codes'] = wasmExports['Be'])(a0, a1));
    var _sqlite3_file_control = (Module['_sqlite3_file_control'] = (a0, a1, a2, a3) =>
      (_sqlite3_file_control = Module['_sqlite3_file_control'] = wasmExports['Ce'])(a0, a1, a2, a3));
    var _sqlite3_test_control = (Module['_sqlite3_test_control'] = (a0, a1) =>
      (_sqlite3_test_control = Module['_sqlite3_test_control'] = wasmExports['De'])(a0, a1));
    var _sqlite3_create_filename = (Module['_sqlite3_create_filename'] = (a0, a1, a2, a3, a4) =>
      (_sqlite3_create_filename = Module['_sqlite3_create_filename'] = wasmExports['Ee'])(a0, a1, a2, a3, a4));
    var _sqlite3_free_filename = (Module['_sqlite3_free_filename'] = (a0) =>
      (_sqlite3_free_filename = Module['_sqlite3_free_filename'] = wasmExports['Fe'])(a0));
    var _sqlite3_uri_parameter = (Module['_sqlite3_uri_parameter'] = (a0, a1) =>
      (_sqlite3_uri_parameter = Module['_sqlite3_uri_parameter'] = wasmExports['Ge'])(a0, a1));
    var _sqlite3_uri_key = (Module['_sqlite3_uri_key'] = (a0, a1) =>
      (_sqlite3_uri_key = Module['_sqlite3_uri_key'] = wasmExports['He'])(a0, a1));
    var _sqlite3_uri_boolean = (Module['_sqlite3_uri_boolean'] = (a0, a1, a2) =>
      (_sqlite3_uri_boolean = Module['_sqlite3_uri_boolean'] = wasmExports['Ie'])(a0, a1, a2));
    var _sqlite3_uri_int64 = (Module['_sqlite3_uri_int64'] = (a0, a1, a2, a3) =>
      (_sqlite3_uri_int64 = Module['_sqlite3_uri_int64'] = wasmExports['Je'])(a0, a1, a2, a3));
    var _sqlite3_filename_database = (Module['_sqlite3_filename_database'] = (a0) =>
      (_sqlite3_filename_database = Module['_sqlite3_filename_database'] = wasmExports['Ke'])(a0));
    var _sqlite3_filename_journal = (Module['_sqlite3_filename_journal'] = (a0) =>
      (_sqlite3_filename_journal = Module['_sqlite3_filename_journal'] = wasmExports['Le'])(a0));
    var _sqlite3_filename_wal = (Module['_sqlite3_filename_wal'] = (a0) =>
      (_sqlite3_filename_wal = Module['_sqlite3_filename_wal'] = wasmExports['Me'])(a0));
    var _sqlite3_db_name = (Module['_sqlite3_db_name'] = (a0, a1) =>
      (_sqlite3_db_name = Module['_sqlite3_db_name'] = wasmExports['Ne'])(a0, a1));
    var _sqlite3_db_filename = (Module['_sqlite3_db_filename'] = (a0, a1) =>
      (_sqlite3_db_filename = Module['_sqlite3_db_filename'] = wasmExports['Oe'])(a0, a1));
    var _sqlite3_db_readonly = (Module['_sqlite3_db_readonly'] = (a0, a1) =>
      (_sqlite3_db_readonly = Module['_sqlite3_db_readonly'] = wasmExports['Pe'])(a0, a1));
    var _sqlite3_compileoption_used = (Module['_sqlite3_compileoption_used'] = (a0) =>
      (_sqlite3_compileoption_used = Module['_sqlite3_compileoption_used'] = wasmExports['Qe'])(a0));
    var _sqlite3_compileoption_get = (Module['_sqlite3_compileoption_get'] = (a0) =>
      (_sqlite3_compileoption_get = Module['_sqlite3_compileoption_get'] = wasmExports['Re'])(a0));
    var _sqlite3_sourceid = (Module['_sqlite3_sourceid'] = () =>
      (_sqlite3_sourceid = Module['_sqlite3_sourceid'] = wasmExports['Se'])());
    var ___errno_location = () => (___errno_location = wasmExports['Te'])();
    var _malloc = (Module['_malloc'] = (a0) => (_malloc = Module['_malloc'] = wasmExports['Ue'])(a0));
    var _free = (Module['_free'] = (a0) => (_free = Module['_free'] = wasmExports['Ve'])(a0));
    var _RegisterExtensionFunctions = (Module['_RegisterExtensionFunctions'] = (a0) =>
      (_RegisterExtensionFunctions = Module['_RegisterExtensionFunctions'] = wasmExports['We'])(a0));
    var _getSqliteFree = (Module['_getSqliteFree'] = () =>
      (_getSqliteFree = Module['_getSqliteFree'] = wasmExports['Xe'])());
    var _main = (Module['_main'] = (a0, a1) => (_main = Module['_main'] = wasmExports['Ye'])(a0, a1));
    var _libauthorizer_set_authorizer = (Module['_libauthorizer_set_authorizer'] = (a0, a1, a2) =>
      (_libauthorizer_set_authorizer = Module['_libauthorizer_set_authorizer'] = wasmExports['Ze'])(a0, a1, a2));
    var _libfunction_create_function = (Module['_libfunction_create_function'] = (a0, a1, a2, a3, a4, a5, a6, a7) =>
      (_libfunction_create_function = Module['_libfunction_create_function'] = wasmExports['_e'])(
        a0,
        a1,
        a2,
        a3,
        a4,
        a5,
        a6,
        a7
      ));
    var _libprogress_progress_handler = (Module['_libprogress_progress_handler'] = (a0, a1, a2, a3) =>
      (_libprogress_progress_handler = Module['_libprogress_progress_handler'] = wasmExports['$e'])(a0, a1, a2, a3));
    var _libvfs_vfs_register = (Module['_libvfs_vfs_register'] = (a0, a1, a2, a3, a4, a5) =>
      (_libvfs_vfs_register = Module['_libvfs_vfs_register'] = wasmExports['af'])(a0, a1, a2, a3, a4, a5));
    var _emscripten_builtin_memalign = (a0, a1) => (_emscripten_builtin_memalign = wasmExports['cf'])(a0, a1);
    var getTempRet0 = () => (getTempRet0 = wasmExports['df'])();
    var stackSave = () => (stackSave = wasmExports['ef'])();
    var stackRestore = (a0) => (stackRestore = wasmExports['ff'])(a0);
    var stackAlloc = (a0) => (stackAlloc = wasmExports['gf'])(a0);
    var _asyncify_start_unwind = (a0) => (_asyncify_start_unwind = wasmExports['hf'])(a0);
    var _asyncify_stop_unwind = () => (_asyncify_stop_unwind = wasmExports['jf'])();
    var _asyncify_start_rewind = (a0) => (_asyncify_start_rewind = wasmExports['kf'])(a0);
    var _asyncify_stop_rewind = () => (_asyncify_stop_rewind = wasmExports['lf'])();
    var _sqlite3_version = (Module['_sqlite3_version'] = 3232);
    Module['getTempRet0'] = getTempRet0;
    Module['ccall'] = ccall;
    Module['cwrap'] = cwrap;
    Module['addFunction'] = addFunction;
    Module['setValue'] = setValue;
    Module['getValue'] = getValue;
    Module['UTF8ToString'] = UTF8ToString;
    Module['stringToUTF8'] = stringToUTF8;
    Module['lengthBytesUTF8'] = lengthBytesUTF8;
    Module['intArrayFromString'] = intArrayFromString;
    Module['intArrayToString'] = intArrayToString;
    Module['AsciiToString'] = AsciiToString;
    Module['UTF16ToString'] = UTF16ToString;
    Module['stringToUTF16'] = stringToUTF16;
    Module['UTF32ToString'] = UTF32ToString;
    Module['stringToUTF32'] = stringToUTF32;
    Module['writeArrayToMemory'] = writeArrayToMemory;
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function callMain() {
      var entryFunction = _main;
      var argc = 0;
      var argv = 0;
      try {
        var ret = entryFunction(argc, argv);
        exitJS(ret, true);
        return ret;
      } catch (e) {
        return handleException(e);
      }
    }
    function run() {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module['calledRun'] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        readyPromiseResolve(Module);
        if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();
        if (shouldRunNow) callMain();
        postRun();
      }
      if (Module['setStatus']) {
        Module['setStatus']('Running...');
        setTimeout(function () {
          setTimeout(function () {
            Module['setStatus']('');
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    if (Module['preInit']) {
      if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
      while (Module['preInit'].length > 0) {
        Module['preInit'].pop()();
      }
    }
    var shouldRunNow = true;
    if (Module['noInitialRun']) shouldRunNow = false;
    run();
    (function () {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      let pAsyncFlags = 0;
      Module['set_authorizer'] = function (db, xAuthorizer, pApp) {
        if (pAsyncFlags) {
          Module['deleteCallback'](pAsyncFlags);
          Module['_sqlite3_free'](pAsyncFlags);
          pAsyncFlags = 0;
        }
        pAsyncFlags = Module['_sqlite3_malloc'](4);
        setValue(pAsyncFlags, xAuthorizer instanceof AsyncFunction ? 1 : 0, 'i32');
        const result = ccall(
          'libauthorizer_set_authorizer',
          'number',
          ['number', 'number', 'number'],
          [db, xAuthorizer ? 1 : 0, pAsyncFlags]
        );
        if (!result && xAuthorizer) {
          Module['setCallback'](pAsyncFlags, (_, iAction, p3, p4, p5, p6) =>
            xAuthorizer(pApp, iAction, p3, p4, p5, p6)
          );
        }
        return result;
      };
    })();
    (function () {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const FUNC_METHODS = ['xFunc', 'xStep', 'xFinal'];
      const mapFunctionNameToKey = new Map();
      Module['create_function'] = function (db, zFunctionName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
        const pAsyncFlags = Module['_sqlite3_malloc'](4);
        const target = { xFunc: xFunc, xStep: xStep, xFinal: xFinal };
        setValue(
          pAsyncFlags,
          FUNC_METHODS.reduce((mask, method, i) => {
            if (target[method] instanceof AsyncFunction) {
              return mask | (1 << i);
            }
            return mask;
          }, 0),
          'i32'
        );
        const result = ccall(
          'libfunction_create_function',
          'number',
          ['number', 'string', 'number', 'number', 'number', 'number', 'number', 'number'],
          [db, zFunctionName, nArg, eTextRep, pAsyncFlags, xFunc ? 1 : 0, xStep ? 1 : 0, xFinal ? 1 : 0]
        );
        if (!result) {
          if (mapFunctionNameToKey.has(zFunctionName)) {
            const oldKey = mapFunctionNameToKey.get(zFunctionName);
            Module['deleteCallback'](oldKey);
          }
          mapFunctionNameToKey.set(zFunctionName, pAsyncFlags);
          Module['setCallback'](pAsyncFlags, { xFunc: xFunc, xStep: xStep, xFinal: xFinal });
        }
        return result;
      };
    })();
    (function () {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      let pAsyncFlags = 0;
      Module['progress_handler'] = function (db, nOps, xProgress, pApp) {
        if (pAsyncFlags) {
          Module['deleteCallback'](pAsyncFlags);
          Module['_sqlite3_free'](pAsyncFlags);
          pAsyncFlags = 0;
        }
        pAsyncFlags = Module['_sqlite3_malloc'](4);
        setValue(pAsyncFlags, xProgress instanceof AsyncFunction ? 1 : 0, 'i32');
        ccall(
          'libprogress_progress_handler',
          'number',
          ['number', 'number', 'number', 'number'],
          [db, nOps, xProgress ? 1 : 0, pAsyncFlags]
        );
        if (xProgress) {
          Module['setCallback'](pAsyncFlags, (_) => xProgress(pApp));
        }
      };
    })();
    (function () {
      const VFS_METHODS = [
        'xOpen',
        'xDelete',
        'xAccess',
        'xFullPathname',
        'xRandomness',
        'xSleep',
        'xCurrentTime',
        'xGetLastError',
        'xCurrentTimeInt64',
        'xClose',
        'xRead',
        'xWrite',
        'xTruncate',
        'xSync',
        'xFileSize',
        'xLock',
        'xUnlock',
        'xCheckReservedLock',
        'xFileControl',
        'xSectorSize',
        'xDeviceCharacteristics',
        'xShmMap',
        'xShmLock',
        'xShmBarrier',
        'xShmUnmap'
      ];
      const mapVFSNameToKey = new Map();
      Module['vfs_register'] = function (vfs, makeDefault) {
        let methodMask = 0;
        let asyncMask = 0;
        VFS_METHODS.forEach((method, i) => {
          if (vfs[method]) {
            methodMask |= 1 << i;
            if (vfs['hasAsyncMethod'](method)) {
              asyncMask |= 1 << i;
            }
          }
        });
        const vfsReturn = Module['_sqlite3_malloc'](4);
        try {
          const result = ccall(
            'libvfs_vfs_register',
            'number',
            ['string', 'number', 'number', 'number', 'number', 'number'],
            [vfs.name, vfs.mxPathname, methodMask, asyncMask, makeDefault ? 1 : 0, vfsReturn]
          );
          if (!result) {
            if (mapVFSNameToKey.has(vfs.name)) {
              const oldKey = mapVFSNameToKey.get(vfs.name);
              Module['deleteCallback'](oldKey);
            }
            const key = getValue(vfsReturn, '*');
            mapVFSNameToKey.set(vfs.name, key);
            Module['setCallback'](key, vfs);
          }
          return result;
        } finally {
          Module['_sqlite3_free'](vfsReturn);
        }
      };
    })();

    return readyPromise;
  };
=======
  var _scriptName = import.meta.url;
  
  return (
function(moduleArg = {}) {
  var moduleRtn;

var d=moduleArg,aa,ba,ca=new Promise((a,b)=>{aa=a;ba=b}),da="object"==typeof window,ea="function"==typeof importScripts,fa=Object.assign({},d),ha="./this.program",ia=(a,b)=>{throw b;},g="",ka,la;
if(da||ea)ea?g=self.location.href:"undefined"!=typeof document&&document.currentScript&&(g=document.currentScript.src),_scriptName&&(g=_scriptName),g.startsWith("blob:")?g="":g=g.substr(0,g.replace(/[?#].*/,"").lastIndexOf("/")+1),ea&&(la=a=>{var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)}),ka=a=>fetch(a,{credentials:"same-origin"}).then(b=>b.ok?b.arrayBuffer():Promise.reject(Error(b.status+" : "+b.url)));
var ma=d.print||console.log.bind(console),r=d.printErr||console.error.bind(console);Object.assign(d,fa);fa=null;d.thisProgram&&(ha=d.thisProgram);d.quit&&(ia=d.quit);var na;d.wasmBinary&&(na=d.wasmBinary);var oa,u=!1,pa,v,w,x,qa,z,B,ra,sa;
function ta(){var a=oa.buffer;d.HEAP8=v=new Int8Array(a);d.HEAP16=x=new Int16Array(a);d.HEAPU8=w=new Uint8Array(a);d.HEAPU16=qa=new Uint16Array(a);d.HEAP32=z=new Int32Array(a);d.HEAPU32=B=new Uint32Array(a);d.HEAPF32=ra=new Float32Array(a);d.HEAPF64=sa=new Float64Array(a)}var ua=[],va=[],wa=[],xa=[];function ya(){var a=d.preRun.shift();ua.unshift(a)}var za=0,Aa=null,Ba=null;
function C(a){d.onAbort?.(a);a="Aborted("+a+")";r(a);u=!0;pa=1;a=new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");ba(a);throw a;}var Ca=a=>a.startsWith("data:application/octet-stream;base64,"),Da;function Ea(a){if(a==Da&&na)return new Uint8Array(na);if(la)return la(a);throw"both async and sync fetching of the wasm failed";}function Fa(a){return na?Promise.resolve().then(()=>Ea(a)):ka(a).then(b=>new Uint8Array(b),()=>Ea(a))}
function Ga(a,b,c){return Fa(a).then(e=>WebAssembly.instantiate(e,b)).then(c,e=>{r(`failed to asynchronously prepare wasm: ${e}`);C(e)})}function Ha(a,b){var c=Da;return na||"function"!=typeof WebAssembly.instantiateStreaming||Ca(c)||"function"!=typeof fetch?Ga(c,a,b):fetch(c,{credentials:"same-origin"}).then(e=>WebAssembly.instantiateStreaming(e,a).then(b,function(f){r(`wasm streaming compile failed: ${f}`);r("falling back to ArrayBuffer instantiation");return Ga(c,a,b)}))}var D,F;
function Ia(a){this.name="ExitStatus";this.message=`Program terminated with exit(${a})`;this.status=a}var Ja=a=>{for(;0<a.length;)a.shift()(d)};function H(a,b="i8"){b.endsWith("*")&&(b="*");switch(b){case "i1":return v[a];case "i8":return v[a];case "i16":return x[a>>1];case "i32":return z[a>>2];case "i64":C("to do getValue(i64) use WASM_BIGINT");case "float":return ra[a>>2];case "double":return sa[a>>3];case "*":return B[a>>2];default:C(`invalid type for getValue: ${b}`)}}
var Ka=d.noExitRuntime||!0;function I(a,b,c="i8"){c.endsWith("*")&&(c="*");switch(c){case "i1":v[a]=b;break;case "i8":v[a]=b;break;case "i16":x[a>>1]=b;break;case "i32":z[a>>2]=b;break;case "i64":C("to do setValue(i64) use WASM_BIGINT");case "float":ra[a>>2]=b;break;case "double":sa[a>>3]=b;break;case "*":B[a>>2]=b;break;default:C(`invalid type for setValue: ${c}`)}}
var La="undefined"!=typeof TextDecoder?new TextDecoder:void 0,J=(a,b,c)=>{var e=b+c;for(c=b;a[c]&&!(c>=e);)++c;if(16<c-b&&a.buffer&&La)return La.decode(a.subarray(b,c));for(e="";b<c;){var f=a[b++];if(f&128){var h=a[b++]&63;if(192==(f&224))e+=String.fromCharCode((f&31)<<6|h);else{var k=a[b++]&63;f=224==(f&240)?(f&15)<<12|h<<6|k:(f&7)<<18|h<<12|k<<6|a[b++]&63;65536>f?e+=String.fromCharCode(f):(f-=65536,e+=String.fromCharCode(55296|f>>10,56320|f&1023))}}else e+=String.fromCharCode(f)}return e},Ma=(a,
b)=>{for(var c=0,e=a.length-1;0<=e;e--){var f=a[e];"."===f?a.splice(e,1):".."===f?(a.splice(e,1),c++):c&&(a.splice(e,1),c--)}if(b)for(;c;c--)a.unshift("..");return a},Na=a=>{var b="/"===a.charAt(0),c="/"===a.substr(-1);(a=Ma(a.split("/").filter(e=>!!e),!b).join("/"))||b||(a=".");a&&c&&(a+="/");return(b?"/":"")+a},Oa=a=>{var b=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);a=b[0];b=b[1];if(!a&&!b)return".";b&&=b.substr(0,b.length-1);return a+b},Pa=a=>{if("/"===a)return"/";
a=Na(a);a=a.replace(/\/$/,"");var b=a.lastIndexOf("/");return-1===b?a:a.substr(b+1)},Qa=()=>{if("object"==typeof crypto&&"function"==typeof crypto.getRandomValues)return a=>crypto.getRandomValues(a);C("initRandomDevice")},Ra=a=>(Ra=Qa())(a),Sa=(...a)=>{for(var b="",c=!1,e=a.length-1;-1<=e&&!c;e--){c=0<=e?a[e]:"/";if("string"!=typeof c)throw new TypeError("Arguments to path.resolve must be strings");if(!c)return"";b=c+"/"+b;c="/"===c.charAt(0)}b=Ma(b.split("/").filter(f=>!!f),!c).join("/");return(c?
"/":"")+b||"."},Ta=[],Ua=a=>{for(var b=0,c=0;c<a.length;++c){var e=a.charCodeAt(c);127>=e?b++:2047>=e?b+=2:55296<=e&&57343>=e?(b+=4,++c):b+=3}return b},K=(a,b,c,e)=>{if(!(0<e))return 0;var f=c;e=c+e-1;for(var h=0;h<a.length;++h){var k=a.charCodeAt(h);if(55296<=k&&57343>=k){var n=a.charCodeAt(++h);k=65536+((k&1023)<<10)|n&1023}if(127>=k){if(c>=e)break;b[c++]=k}else{if(2047>=k){if(c+1>=e)break;b[c++]=192|k>>6}else{if(65535>=k){if(c+2>=e)break;b[c++]=224|k>>12}else{if(c+3>=e)break;b[c++]=240|k>>18;b[c++]=
128|k>>12&63}b[c++]=128|k>>6&63}b[c++]=128|k&63}}b[c]=0;return c-f};function Va(a,b,c){c=Array(0<c?c:Ua(a)+1);a=K(a,c,0,c.length);b&&(c.length=a);return c}var Wa=[];function Xa(a,b){Wa[a]={input:[],Ff:[],Qf:b};Ya(a,Za)}
var Za={open(a){var b=Wa[a.node.Tf];if(!b)throw new N(43);a.Gf=b;a.seekable=!1},close(a){a.Gf.Qf.Vf(a.Gf)},Vf(a){a.Gf.Qf.Vf(a.Gf)},read(a,b,c,e){if(!a.Gf||!a.Gf.Qf.kg)throw new N(60);for(var f=0,h=0;h<e;h++){try{var k=a.Gf.Qf.kg(a.Gf)}catch(n){throw new N(29);}if(void 0===k&&0===f)throw new N(6);if(null===k||void 0===k)break;f++;b[c+h]=k}f&&(a.node.timestamp=Date.now());return f},write(a,b,c,e){if(!a.Gf||!a.Gf.Qf.eg)throw new N(60);try{for(var f=0;f<e;f++)a.Gf.Qf.eg(a.Gf,b[c+f])}catch(h){throw new N(29);
}e&&(a.node.timestamp=Date.now());return f}},$a={kg(){a:{if(!Ta.length){var a=null;"undefined"!=typeof window&&"function"==typeof window.prompt&&(a=window.prompt("Input: "),null!==a&&(a+="\n"));if(!a){a=null;break a}Ta=Va(a,!0)}a=Ta.shift()}return a},eg(a,b){null===b||10===b?(ma(J(a.Ff,0)),a.Ff=[]):0!=b&&a.Ff.push(b)},Vf(a){a.Ff&&0<a.Ff.length&&(ma(J(a.Ff,0)),a.Ff=[])},Lg(){return{Gg:25856,Ig:5,Fg:191,Hg:35387,Eg:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},Mg(){return 0},
Ng(){return[24,80]}},ab={eg(a,b){null===b||10===b?(r(J(a.Ff,0)),a.Ff=[]):0!=b&&a.Ff.push(b)},Vf(a){a.Ff&&0<a.Ff.length&&(r(J(a.Ff,0)),a.Ff=[])}};function bb(a,b){var c=a.Bf?a.Bf.length:0;c>=b||(b=Math.max(b,c*(1048576>c?2:1.125)>>>0),0!=c&&(b=Math.max(b,256)),c=a.Bf,a.Bf=new Uint8Array(b),0<a.Df&&a.Bf.set(c.subarray(0,a.Df),0))}
var O={Jf:null,If(){return O.createNode(null,"/",16895,0)},createNode(a,b,c,e){if(24576===(c&61440)||4096===(c&61440))throw new N(63);O.Jf||(O.Jf={dir:{node:{Hf:O.zf.Hf,Ef:O.zf.Ef,Rf:O.zf.Rf,Wf:O.zf.Wf,og:O.zf.og,ag:O.zf.ag,Zf:O.zf.Zf,ng:O.zf.ng,$f:O.zf.$f},stream:{Nf:O.Af.Nf}},file:{node:{Hf:O.zf.Hf,Ef:O.zf.Ef},stream:{Nf:O.Af.Nf,read:O.Af.read,write:O.Af.write,hg:O.Af.hg,Xf:O.Af.Xf,Yf:O.Af.Yf}},link:{node:{Hf:O.zf.Hf,Ef:O.zf.Ef,Uf:O.zf.Uf},stream:{}},ig:{node:{Hf:O.zf.Hf,Ef:O.zf.Ef},stream:cb}});
c=db(a,b,c,e);P(c.mode)?(c.zf=O.Jf.dir.node,c.Af=O.Jf.dir.stream,c.Bf={}):32768===(c.mode&61440)?(c.zf=O.Jf.file.node,c.Af=O.Jf.file.stream,c.Df=0,c.Bf=null):40960===(c.mode&61440)?(c.zf=O.Jf.link.node,c.Af=O.Jf.link.stream):8192===(c.mode&61440)&&(c.zf=O.Jf.ig.node,c.Af=O.Jf.ig.stream);c.timestamp=Date.now();a&&(a.Bf[b]=c,a.timestamp=c.timestamp);return c},Kg(a){return a.Bf?a.Bf.subarray?a.Bf.subarray(0,a.Df):new Uint8Array(a.Bf):new Uint8Array(0)},zf:{Hf(a){var b={};b.ug=8192===(a.mode&61440)?a.id:
1;b.lg=a.id;b.mode=a.mode;b.Ag=1;b.uid=0;b.xg=0;b.Tf=a.Tf;P(a.mode)?b.size=4096:32768===(a.mode&61440)?b.size=a.Df:40960===(a.mode&61440)?b.size=a.link.length:b.size=0;b.qg=new Date(a.timestamp);b.zg=new Date(a.timestamp);b.tg=new Date(a.timestamp);b.rg=4096;b.sg=Math.ceil(b.size/b.rg);return b},Ef(a,b){void 0!==b.mode&&(a.mode=b.mode);void 0!==b.timestamp&&(a.timestamp=b.timestamp);if(void 0!==b.size&&(b=b.size,a.Df!=b))if(0==b)a.Bf=null,a.Df=0;else{var c=a.Bf;a.Bf=new Uint8Array(b);c&&a.Bf.set(c.subarray(0,
Math.min(b,a.Df)));a.Df=b}},Rf(){throw eb[44];},Wf(a,b,c,e){return O.createNode(a,b,c,e)},og(a,b,c){if(P(a.mode)){try{var e=fb(b,c)}catch(h){}if(e)for(var f in e.Bf)throw new N(55);}delete a.parent.Bf[a.name];a.parent.timestamp=Date.now();a.name=c;b.Bf[c]=a;b.timestamp=a.parent.timestamp},ag(a,b){delete a.Bf[b];a.timestamp=Date.now()},Zf(a,b){var c=fb(a,b),e;for(e in c.Bf)throw new N(55);delete a.Bf[b];a.timestamp=Date.now()},ng(a){var b=[".",".."],c;for(c of Object.keys(a.Bf))b.push(c);return b},
$f(a,b,c){a=O.createNode(a,b,41471,0);a.link=c;return a},Uf(a){if(40960!==(a.mode&61440))throw new N(28);return a.link}},Af:{read(a,b,c,e,f){var h=a.node.Bf;if(f>=a.node.Df)return 0;a=Math.min(a.node.Df-f,e);if(8<a&&h.subarray)b.set(h.subarray(f,f+a),c);else for(e=0;e<a;e++)b[c+e]=h[f+e];return a},write(a,b,c,e,f,h){b.buffer===v.buffer&&(h=!1);if(!e)return 0;a=a.node;a.timestamp=Date.now();if(b.subarray&&(!a.Bf||a.Bf.subarray)){if(h)return a.Bf=b.subarray(c,c+e),a.Df=e;if(0===a.Df&&0===f)return a.Bf=
b.slice(c,c+e),a.Df=e;if(f+e<=a.Df)return a.Bf.set(b.subarray(c,c+e),f),e}bb(a,f+e);if(a.Bf.subarray&&b.subarray)a.Bf.set(b.subarray(c,c+e),f);else for(h=0;h<e;h++)a.Bf[f+h]=b[c+h];a.Df=Math.max(a.Df,f+e);return e},Nf(a,b,c){1===c?b+=a.position:2===c&&32768===(a.node.mode&61440)&&(b+=a.node.Df);if(0>b)throw new N(28);return b},hg(a,b,c){bb(a.node,b+c);a.node.Df=Math.max(a.node.Df,b+c)},Xf(a,b,c,e,f){if(32768!==(a.node.mode&61440))throw new N(43);a=a.node.Bf;if(f&2||a.buffer!==v.buffer){if(0<c||c+
b<a.length)a.subarray?a=a.subarray(c,c+b):a=Array.prototype.slice.call(a,c,c+b);c=!0;b=65536*Math.ceil(b/65536);(f=gb(65536,b))?(w.fill(0,f,f+b),b=f):b=0;if(!b)throw new N(48);v.set(a,b)}else c=!1,b=a.byteOffset;return{Bg:b,pg:c}},Yf(a,b,c,e){O.Af.write(a,b,0,e,c,!1);return 0}}},hb=(a,b)=>{var c=0;a&&(c|=365);b&&(c|=146);return c},ib=null,jb={},kb=[],lb=1,Q=null,mb=!0,N=class{constructor(a){this.name="ErrnoError";this.Cf=a}},eb={},nb=class{constructor(){this.bg={};this.node=null}get flags(){return this.bg.flags}set flags(a){this.bg.flags=
a}get position(){return this.bg.position}set position(a){this.bg.position=a}},ob=class{constructor(a,b,c,e){a||=this;this.parent=a;this.If=a.If;this.Of=null;this.id=lb++;this.name=b;this.mode=c;this.zf={};this.Af={};this.Tf=e}get read(){return 365===(this.mode&365)}set read(a){a?this.mode|=365:this.mode&=-366}get write(){return 146===(this.mode&146)}set write(a){a?this.mode|=146:this.mode&=-147}};
function R(a,b={}){a=Sa(a);if(!a)return{path:"",node:null};b=Object.assign({jg:!0,fg:0},b);if(8<b.fg)throw new N(32);a=a.split("/").filter(k=>!!k);for(var c=ib,e="/",f=0;f<a.length;f++){var h=f===a.length-1;if(h&&b.parent)break;c=fb(c,a[f]);e=Na(e+"/"+a[f]);c.Of&&(!h||h&&b.jg)&&(c=c.Of.root);if(!h||b.Mf)for(h=0;40960===(c.mode&61440);)if(c=pb(e),e=Sa(Oa(e),c),c=R(e,{fg:b.fg+1}).node,40<h++)throw new N(32);}return{path:e,node:c}}
function qb(a){for(var b;;){if(a===a.parent)return a=a.If.mg,b?"/"!==a[a.length-1]?`${a}/${b}`:a+b:a;b=b?`${a.name}/${b}`:a.name;a=a.parent}}function rb(a,b){for(var c=0,e=0;e<b.length;e++)c=(c<<5)-c+b.charCodeAt(e)|0;return(a+c>>>0)%Q.length}function sb(a){var b=rb(a.parent.id,a.name);if(Q[b]===a)Q[b]=a.Pf;else for(b=Q[b];b;){if(b.Pf===a){b.Pf=a.Pf;break}b=b.Pf}}
function fb(a,b){var c=P(a.mode)?(c=tb(a,"x"))?c:a.zf.Rf?0:2:54;if(c)throw new N(c);for(c=Q[rb(a.id,b)];c;c=c.Pf){var e=c.name;if(c.parent.id===a.id&&e===b)return c}return a.zf.Rf(a,b)}function db(a,b,c,e){a=new ob(a,b,c,e);b=rb(a.parent.id,a.name);a.Pf=Q[b];return Q[b]=a}function P(a){return 16384===(a&61440)}function ub(a){var b=["r","w","rw"][a&3];a&512&&(b+="w");return b}
function tb(a,b){if(mb)return 0;if(!b.includes("r")||a.mode&292){if(b.includes("w")&&!(a.mode&146)||b.includes("x")&&!(a.mode&73))return 2}else return 2;return 0}function vb(a,b){try{return fb(a,b),20}catch(c){}return tb(a,"wx")}function wb(a,b,c){try{var e=fb(a,b)}catch(f){return f.Cf}if(a=tb(a,"wx"))return a;if(c){if(!P(e.mode))return 54;if(e===e.parent||"/"===qb(e))return 10}else if(P(e.mode))return 31;return 0}function S(a){a=kb[a];if(!a)throw new N(8);return a}
function xb(a,b=-1){a=Object.assign(new nb,a);if(-1==b)a:{for(b=0;4096>=b;b++)if(!kb[b])break a;throw new N(33);}a.Kf=b;return kb[b]=a}function yb(a,b=-1){a=xb(a,b);a.Af?.Jg?.(a);return a}var cb={open(a){a.Af=jb[a.node.Tf].Af;a.Af.open?.(a)},Nf(){throw new N(70);}};function Ya(a,b){jb[a]={Af:b}}
function zb(a,b){var c="/"===b;if(c&&ib)throw new N(10);if(!c&&b){var e=R(b,{jg:!1});b=e.path;e=e.node;if(e.Of)throw new N(10);if(!P(e.mode))throw new N(54);}b={type:a,Og:{},mg:b,yg:[]};a=a.If(b);a.If=b;b.root=a;c?ib=a:e&&(e.Of=b,e.If&&e.If.yg.push(b))}function Ab(a,b,c){var e=R(a,{parent:!0}).node;a=Pa(a);if(!a||"."===a||".."===a)throw new N(28);var f=vb(e,a);if(f)throw new N(f);if(!e.zf.Wf)throw new N(63);return e.zf.Wf(e,a,b,c)}function T(a,b){return Ab(a,(void 0!==b?b:511)&1023|16384,0)}
function Bb(a,b,c){"undefined"==typeof c&&(c=b,b=438);Ab(a,b|8192,c)}function Cb(a,b){if(!Sa(a))throw new N(44);var c=R(b,{parent:!0}).node;if(!c)throw new N(44);b=Pa(b);var e=vb(c,b);if(e)throw new N(e);if(!c.zf.$f)throw new N(63);c.zf.$f(c,b,a)}function Db(a){var b=R(a,{parent:!0}).node;a=Pa(a);var c=fb(b,a),e=wb(b,a,!0);if(e)throw new N(e);if(!b.zf.Zf)throw new N(63);if(c.Of)throw new N(10);b.zf.Zf(b,a);sb(c)}
function pb(a){a=R(a).node;if(!a)throw new N(44);if(!a.zf.Uf)throw new N(28);return Sa(qb(a.parent),a.zf.Uf(a))}function Eb(a,b){a=R(a,{Mf:!b}).node;if(!a)throw new N(44);if(!a.zf.Hf)throw new N(63);return a.zf.Hf(a)}function Fb(a){return Eb(a,!0)}function Gb(a,b){a="string"==typeof a?R(a,{Mf:!0}).node:a;if(!a.zf.Ef)throw new N(63);a.zf.Ef(a,{mode:b&4095|a.mode&-4096,timestamp:Date.now()})}
function Hb(a,b){if(0>b)throw new N(28);a="string"==typeof a?R(a,{Mf:!0}).node:a;if(!a.zf.Ef)throw new N(63);if(P(a.mode))throw new N(31);if(32768!==(a.mode&61440))throw new N(28);var c=tb(a,"w");if(c)throw new N(c);a.zf.Ef(a,{size:b,timestamp:Date.now()})}
function Ib(a,b,c){if(""===a)throw new N(44);if("string"==typeof b){var e={r:0,"r+":2,w:577,"w+":578,a:1089,"a+":1090}[b];if("undefined"==typeof e)throw Error(`Unknown file open mode: ${b}`);b=e}c=b&64?("undefined"==typeof c?438:c)&4095|32768:0;if("object"==typeof a)var f=a;else{a=Na(a);try{f=R(a,{Mf:!(b&131072)}).node}catch(h){}}e=!1;if(b&64)if(f){if(b&128)throw new N(20);}else f=Ab(a,c,0),e=!0;if(!f)throw new N(44);8192===(f.mode&61440)&&(b&=-513);if(b&65536&&!P(f.mode))throw new N(54);if(!e&&(c=
f?40960===(f.mode&61440)?32:P(f.mode)&&("r"!==ub(b)||b&512)?31:tb(f,ub(b)):44))throw new N(c);b&512&&!e&&Hb(f,0);b&=-131713;f=xb({node:f,path:qb(f),flags:b,seekable:!0,position:0,Af:f.Af,Dg:[],error:!1});f.Af.open&&f.Af.open(f);!d.logReadFiles||b&1||(Jb||={},a in Jb||(Jb[a]=1));return f}function Kb(a,b,c){if(null===a.Kf)throw new N(8);if(!a.seekable||!a.Af.Nf)throw new N(70);if(0!=c&&1!=c&&2!=c)throw new N(28);a.position=a.Af.Nf(a,b,c);a.Dg=[]}var Lb;
function Mb(a,b,c){a=Na("/dev/"+a);var e=hb(!!b,!!c);Nb||=64;var f=Nb++<<8|0;Ya(f,{open(h){h.seekable=!1},close(){c?.buffer?.length&&c(10)},read(h,k,n,l){for(var m=0,p=0;p<l;p++){try{var q=b()}catch(t){throw new N(29);}if(void 0===q&&0===m)throw new N(6);if(null===q||void 0===q)break;m++;k[n+p]=q}m&&(h.node.timestamp=Date.now());return m},write(h,k,n,l){for(var m=0;m<l;m++)try{c(k[n+m])}catch(p){throw new N(29);}l&&(h.node.timestamp=Date.now());return m}});Bb(a,e,f)}var Nb,U={},Jb;
function Ob(a,b,c){if("/"===b.charAt(0))return b;a=-100===a?"/":S(a).path;if(0==b.length){if(!c)throw new N(44);return a}return Na(a+"/"+b)}
function Pb(a,b,c){a=a(b);z[c>>2]=a.ug;z[c+4>>2]=a.mode;B[c+8>>2]=a.Ag;z[c+12>>2]=a.uid;z[c+16>>2]=a.xg;z[c+20>>2]=a.Tf;F=[a.size>>>0,(D=a.size,1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:0)];z[c+24>>2]=F[0];z[c+28>>2]=F[1];z[c+32>>2]=4096;z[c+36>>2]=a.sg;b=a.qg.getTime();var e=a.zg.getTime(),f=a.tg.getTime();F=[Math.floor(b/1E3)>>>0,(D=Math.floor(b/1E3),1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:
0)];z[c+40>>2]=F[0];z[c+44>>2]=F[1];B[c+48>>2]=b%1E3*1E3;F=[Math.floor(e/1E3)>>>0,(D=Math.floor(e/1E3),1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:0)];z[c+56>>2]=F[0];z[c+60>>2]=F[1];B[c+64>>2]=e%1E3*1E3;F=[Math.floor(f/1E3)>>>0,(D=Math.floor(f/1E3),1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:0)];z[c+72>>2]=F[0];z[c+76>>2]=F[1];B[c+80>>2]=f%1E3*1E3;F=[a.lg>>>0,(D=a.lg,1<=+Math.abs(D)?0<D?+Math.floor(D/
4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:0)];z[c+88>>2]=F[0];z[c+92>>2]=F[1];return 0}var Qb=void 0;function Rb(){var a=z[+Qb>>2];Qb+=4;return a}
var Sb=(a,b)=>b+2097152>>>0<4194305-!!a?(a>>>0)+4294967296*b:NaN,Tb=[0,31,60,91,121,152,182,213,244,274,305,335],Ub=[0,31,59,90,120,151,181,212,243,273,304,334],Vb={},Xb=()=>{if(!Wb){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"==typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:ha||"./this.program"},b;for(b in Vb)void 0===Vb[b]?delete a[b]:a[b]=Vb[b];var c=[];for(b in a)c.push(`${b}=${a[b]}`);Wb=c}return Wb},
Wb;function Yb(){}function Zb(){}function $b(){}function ac(){}function bc(){}function cc(){}function dc(){}function ec(){}function fc(){}function gc(){}function hc(){}function ic(){}function jc(){}function kc(){}function lc(){}function mc(){}function nc(){}function oc(){}function pc(){}function qc(){}function rc(){}function sc(){}function tc(){}function uc(){}function vc(){}function wc(){}function xc(){}function yc(){}function zc(){}function Ac(){}function Bc(){}function Cc(){}function Dc(){}
function Ec(){}function Fc(){}function Gc(){}function Hc(){}function Ic(){}function Jc(){}var Kc=0,Lc=a=>{pa=a;Ka||0<Kc||(d.onExit?.(a),u=!0);ia(a,new Ia(a))},Mc=a=>{a instanceof Ia||"unwind"==a||ia(1,a)},Nc=a=>{try{a()}catch(b){C(b)}},Oc=a=>{if(!u)try{if(a(),!(Ka||0<Kc))try{pa=a=pa,Lc(a)}catch(b){Mc(b)}}catch(b){Mc(b)}};
function Pc(){var a=V,b={};for(let [c,e]of Object.entries(a))b[c]="function"==typeof e?(...f)=>{Qc.push(c);try{return e(...f)}finally{u||(Qc.pop(),W&&1===Y&&0===Qc.length&&(Y=0,Nc(Rc),"undefined"!=typeof Fibers&&Fibers.Pg()))}}:e;return b}var Y=0,W=null,Sc=0,Qc=[],Tc={},Uc={},Vc=0,Wc=null,Xc=[];function Yc(){return new Promise((a,b)=>{Wc={resolve:a,reject:b}})}
function Zc(){var a=$c(16396),b=a+12;B[a>>2]=b;B[a+4>>2]=b+16384;b=Qc[0];var c=Tc[b];void 0===c&&(c=Vc++,Tc[b]=c,Uc[c]=b);z[a+8>>2]=c;return a}
function ad(a){if(!u){if(0===Y){var b=!1,c=!1;a((e=0)=>{if(!u&&(Sc=e,b=!0,c)){Y=2;Nc(()=>bd(W));"undefined"!=typeof Browser&&Browser.dg.wg&&Browser.dg.resume();e=!1;try{var f=(0,V[Uc[z[W+8>>2]]])()}catch(n){f=n,e=!0}var h=!1;if(!W){var k=Wc;k&&(Wc=null,(e?k.reject:k.resolve)(f),h=!0)}if(e&&!h)throw f;}});c=!0;b||(Y=1,W=Zc(),"undefined"!=typeof Browser&&Browser.dg.wg&&Browser.dg.pause(),Nc(()=>cd(W)))}else 2===Y?(Y=0,Nc(dd),ed(W),W=null,Xc.forEach(Oc)):C(`invalid state: ${Y}`);return Sc}}
function fd(a){return ad(b=>{a().then(b)})}
var gd={},hd,jd,kd=[],Z=(a,b,c,e,f)=>{function h(q){--Kc;0!==l&&ld(l);return"string"===b?q?J(w,q):"":"boolean"===b?!!q:q}var k={string:q=>{var t=0;if(null!==q&&void 0!==q&&0!==q){t=Ua(q)+1;var y=md(t);K(q,w,y,t);t=y}return t},array:q=>{var t=md(q.length);v.set(q,t);return t}};a=d["_"+a];var n=[],l=0;if(e)for(var m=0;m<e.length;m++){var p=k[c[m]];p?(0===l&&(l=nd()),n[m]=p(e[m])):n[m]=e[m]}c=W;e=a(...n);f=f?.async;Kc+=1;if(W!=c)return Yc().then(h);e=h(e);return f?Promise.resolve(e):e},od="undefined"!=
typeof TextDecoder?new TextDecoder("utf-16le"):void 0;[44].forEach(a=>{eb[a]=new N(a);eb[a].stack="<generic error, no stack>"});Q=Array(4096);zb(O,"/");T("/tmp");T("/home");T("/home/web_user");(function(){T("/dev");Ya(259,{read:()=>0,write:(e,f,h,k)=>k});Bb("/dev/null",259);Xa(1280,$a);Xa(1536,ab);Bb("/dev/tty",1280);Bb("/dev/tty1",1536);var a=new Uint8Array(1024),b=0,c=()=>{0===b&&(b=Ra(a).byteLength);return a[--b]};Mb("random",c);Mb("urandom",c);T("/dev/shm");T("/dev/shm/tmp")})();
(function(){T("/proc");var a=T("/proc/self");T("/proc/self/fd");zb({If(){var b=db(a,"fd",16895,73);b.zf={Rf(c,e){var f=S(+e);c={parent:null,If:{mg:"fake"},zf:{Uf:()=>f.path}};return c.parent=c}};return b}},"/proc/self/fd")})();
(function(){const a=new Map;d.setAuthorizer=function(b,c,e){c?a.set(b,{f:c,gg:e}):a.delete(b);return Z("set_authorizer","number",["number"],[b])};Yb=function(b,c,e,f,h,k){if(a.has(b)){const {f:n,gg:l}=a.get(b);return n(l,c,e?e?J(w,e):"":null,f?f?J(w,f):"":null,h?h?J(w,h):"":null,k?k?J(w,k):"":null)}return 0}})();
(function(){const a=new Map,b=new Map;d.createFunction=function(c,e,f,h,k,n){const l=a.size;a.set(l,{f:n,Lf:k});return Z("create_function","number","number string number number number number".split(" "),[c,e,f,h,l,0])};d.createAggregate=function(c,e,f,h,k,n,l){const m=a.size;a.set(m,{step:n,vg:l,Lf:k});return Z("create_function","number","number string number number number number".split(" "),[c,e,f,h,m,1])};d.getFunctionUserData=function(c){return b.get(c)};$b=function(c,e,f,h){c=a.get(c);b.set(e,
c.Lf);c.f(e,new Uint32Array(w.buffer,h,f));b.delete(e)};bc=function(c,e,f,h){c=a.get(c);b.set(e,c.Lf);c.step(e,new Uint32Array(w.buffer,h,f));b.delete(e)};Zb=function(c,e){c=a.get(c);b.set(e,c.Lf);c.vg(e);b.delete(e)}})();(function(){const a=new Map;d.progressHandler=function(b,c,e,f){e?a.set(b,{f:e,gg:f}):a.delete(b);return Z("progress_handler",null,["number","number"],[b,c])};ac=function(b){if(a.has(b)){const {f:c,gg:e}=a.get(b);return c(e)}return 0}})();
(function(){function a(l,m){const p=`get${l}`,q=`set${l}`;return new Proxy(new DataView(w.buffer,m,"Int32"===l?4:8),{get(t,y){if(y===p)return function(A,G){if(!G)throw Error("must be little endian");return t[y](A,G)};if(y===q)return function(A,G,E){if(!E)throw Error("must be little endian");return t[y](A,G,E)};if("string"===typeof y&&y.match(/^(get)|(set)/))throw Error("invalid type");return t[y]}})}const b="object"===typeof gd,c=new Map,e=new Map,f=new Map,h=b?new Set:null,k=b?new Set:null,n=new Map;
sc=function(l,m,p,q){n.set(l?J(w,l):"",{size:m,Sf:Array.from(new Uint32Array(w.buffer,q,p))})};d.createModule=function(l,m,p,q){b&&(p.handleAsync=fd);const t=c.size;c.set(t,{module:p,Lf:q});q=0;p.xCreate&&(q|=1);p.xConnect&&(q|=2);p.xBestIndex&&(q|=4);p.xDisconnect&&(q|=8);p.xDestroy&&(q|=16);p.xOpen&&(q|=32);p.xClose&&(q|=64);p.xFilter&&(q|=128);p.xNext&&(q|=256);p.xEof&&(q|=512);p.xColumn&&(q|=1024);p.xRowid&&(q|=2048);p.xUpdate&&(q|=4096);p.xBegin&&(q|=8192);p.xSync&&(q|=16384);p.xCommit&&(q|=
32768);p.xRollback&&(q|=65536);p.xFindFunction&&(q|=131072);p.xRename&&(q|=262144);return Z("create_module","number",["number","string","number","number"],[l,m,t,q])};ic=function(l,m,p,q,t,y){m=c.get(m);e.set(t,m);if(b){h.delete(t);for(const A of h)e.delete(A)}q=Array.from(new Uint32Array(w.buffer,q,p)).map(A=>A?J(w,A):"");return m.module.xCreate(l,m.Lf,q,t,a("Int32",y))};hc=function(l,m,p,q,t,y){m=c.get(m);e.set(t,m);if(b){h.delete(t);for(const A of h)e.delete(A)}q=Array.from(new Uint32Array(w.buffer,
q,p)).map(A=>A?J(w,A):"");return m.module.xConnect(l,m.Lf,q,t,a("Int32",y))};dc=function(l,m){var p=e.get(l),q=n.get("sqlite3_index_info").Sf;const t={};t.nConstraint=H(m+q[0],"i32");t.aConstraint=[];var y=H(m+q[1],"*"),A=n.get("sqlite3_index_constraint").size;for(var G=0;G<t.nConstraint;++G){var E=t.aConstraint,M=E.push,L=y+G*A,ja=n.get("sqlite3_index_constraint").Sf,X={};X.iColumn=H(L+ja[0],"i32");X.op=H(L+ja[1],"i8");X.usable=!!H(L+ja[2],"i8");M.call(E,X)}t.nOrderBy=H(m+q[2],"i32");t.aOrderBy=
[];y=H(m+q[3],"*");A=n.get("sqlite3_index_orderby").size;for(G=0;G<t.nOrderBy;++G)E=t.aOrderBy,M=E.push,L=y+G*A,ja=n.get("sqlite3_index_orderby").Sf,X={},X.iColumn=H(L+ja[0],"i32"),X.desc=!!H(L+ja[1],"i8"),M.call(E,X);t.aConstraintUsage=[];for(y=0;y<t.nConstraint;++y)t.aConstraintUsage.push({argvIndex:0,omit:!1});t.idxNum=H(m+q[5],"i32");t.idxStr=null;t.orderByConsumed=!!H(m+q[8],"i8");t.estimatedCost=H(m+q[9],"double");t.estimatedRows=H(m+q[10],"i32");t.idxFlags=H(m+q[11],"i32");t.colUsed=H(m+q[12],
"i32");l=p.module.xBestIndex(l,t);p=n.get("sqlite3_index_info").Sf;q=H(m+p[4],"*");y=n.get("sqlite3_index_constraint_usage").size;for(M=0;M<t.nConstraint;++M)A=q+M*y,E=t.aConstraintUsage[M],L=n.get("sqlite3_index_constraint_usage").Sf,I(A+L[0],E.argvIndex,"i32"),I(A+L[1],E.omit?1:0,"i8");I(m+p[5],t.idxNum,"i32");"string"===typeof t.idxStr&&(q=Ua(t.idxStr),y=Z("sqlite3_malloc","number",["number"],[q+1]),K(t.idxStr,w,y,q+1),I(m+p[6],y,"*"),I(m+p[7],1,"i32"));I(m+p[8],t.orderByConsumed,"i32");I(m+p[9],
t.estimatedCost,"double");I(m+p[10],t.estimatedRows,"i32");I(m+p[11],t.idxFlags,"i32");return l};kc=function(l){const m=e.get(l);b?h.add(l):e.delete(l);return m.module.xDisconnect(l)};jc=function(l){const m=e.get(l);b?h.add(l):e.delete(l);return m.module.xDestroy(l)};oc=function(l,m){const p=e.get(l);f.set(m,p);if(b){k.delete(m);for(const q of k)f.delete(q)}return p.module.xOpen(l,m)};ec=function(l){const m=f.get(l);b?k.add(l):f.delete(l);return m.module.xClose(l)};lc=function(l){return f.get(l).module.xEof(l)?
1:0};mc=function(l,m,p,q,t){const y=f.get(l);p=p?p?J(w,p):"":null;t=new Uint32Array(w.buffer,t,q);return y.module.xFilter(l,m,p,t)};nc=function(l){return f.get(l).module.xNext(l)};fc=function(l,m,p){return f.get(l).module.xColumn(l,m,p)};rc=function(l,m){return f.get(l).module.xRowid(l,a("BigInt64",m))};uc=function(l,m,p,q){const t=e.get(l);p=new Uint32Array(w.buffer,p,m);return t.module.xUpdate(l,p,a("BigInt64",q))};cc=function(l){return e.get(l).module.xBegin(l)};tc=function(l){return e.get(l).module.xSync(l)};
gc=function(l){return e.get(l).module.xCommit(l)};qc=function(l){return e.get(l).module.xRollback(l)};pc=function(l,m){const p=e.get(l);m=m?J(w,m):"";return p.module.xRename(l,m)}})();
(function(){function a(h,k){const n=`get${h}`,l=`set${h}`;return new Proxy(new DataView(w.buffer,k,"Int32"===h?4:8),{get(m,p){if(p===n)return function(q,t){if(!t)throw Error("must be little endian");return m[p](q,t)};if(p===l)return function(q,t,y){if(!y)throw Error("must be little endian");return m[p](q,t,y)};if("string"===typeof p&&p.match(/^(get)|(set)/))throw Error("invalid type");return m[p]}})}const b="object"===typeof gd;b&&(d.handleAsync=fd);const c=new Map,e=new Map;d.registerVFS=function(h,
k){if(Z("sqlite3_vfs_find","number",["string"],[h.name]))throw Error(`VFS '${h.name}' already registered`);b&&(h.handleAsync=fd);var n=h.mxPathName??64;const l=d._malloc(4);k=Z("register_vfs","number",["string","number","number","number"],[h.name,n,k?1:0,l]);k||(n=H(l,"*"),c.set(n,h));d._free(l);return k};const f=b?new Set:null;xc=function(h){const k=e.get(h);b?f.add(h):e.delete(h);return k.xClose(h)};Ec=function(h,k,n,l,m){return e.get(h).xRead(h,w.subarray(k,k+n),4294967296*m+l+(0>l?2**32:0))};
Jc=function(h,k,n,l,m){return e.get(h).xWrite(h,w.subarray(k,k+n),4294967296*m+l+(0>l?2**32:0))};Hc=function(h,k,n){return e.get(h).xTruncate(h,4294967296*n+k+(0>k?2**32:0))};Gc=function(h,k){return e.get(h).xSync(h,k)};Bc=function(h,k){const n=e.get(h);k=a("BigInt64",k);return n.xFileSize(h,k)};Cc=function(h,k){return e.get(h).xLock(h,k)};Ic=function(h,k){return e.get(h).xUnlock(h,k)};wc=function(h,k){const n=e.get(h);k=a("Int32",k);return n.xCheckReservedLock(h,k)};Ac=function(h,k,n){const l=e.get(h);
n=new DataView(w.buffer,n);return l.xFileControl(h,k,n)};Fc=function(h){return e.get(h).xSectorSize(h)};zc=function(h){return e.get(h).xDeviceCharacteristics(h)};Dc=function(h,k,n,l,m){h=c.get(h);e.set(n,h);if(b){f.delete(n);for(var p of f)e.delete(p)}p=null;if(l&64){p=1;const q=[];for(;p;){const t=w[k++];if(t)q.push(t);else switch(w[k]||(p=null),p){case 1:q.push(63);p=2;break;case 2:q.push(61);p=3;break;case 3:q.push(38),p=2}}p=(new TextDecoder).decode(new Uint8Array(q))}else k&&(p=k?J(w,k):"");
m=a("Int32",m);return h.xOpen(p,n,l,m)};yc=function(h,k,n){return c.get(h).xDelete(k?J(w,k):"",n)};vc=function(h,k,n,l){h=c.get(h);l=a("Int32",l);return h.xAccess(k?J(w,k):"",n,l)}})();
var pd={a:(a,b,c,e)=>{C(`Assertion failed: ${a?J(w,a):""}, at: `+[b?b?J(w,b):"":"unknown filename",c,e?e?J(w,e):"":"unknown function"])},N:function(a,b){try{return a=a?J(w,a):"",Gb(a,b),0}catch(c){if("undefined"==typeof U||"ErrnoError"!==c.name)throw c;return-c.Cf}},Q:function(a,b,c){try{b=b?J(w,b):"";b=Ob(a,b);if(c&-8)return-28;var e=R(b,{Mf:!0}).node;if(!e)return-44;a="";c&4&&(a+="r");c&2&&(a+="w");c&1&&(a+="x");return a&&tb(e,a)?-2:0}catch(f){if("undefined"==typeof U||"ErrnoError"!==f.name)throw f;
return-f.Cf}},O:function(a,b){try{var c=S(a);Gb(c.node,b);return 0}catch(e){if("undefined"==typeof U||"ErrnoError"!==e.name)throw e;return-e.Cf}},M:function(a){try{var b=S(a).node;var c="string"==typeof b?R(b,{Mf:!0}).node:b;if(!c.zf.Ef)throw new N(63);c.zf.Ef(c,{timestamp:Date.now()});return 0}catch(e){if("undefined"==typeof U||"ErrnoError"!==e.name)throw e;return-e.Cf}},b:function(a,b,c){Qb=c;try{var e=S(a);switch(b){case 0:var f=Rb();if(0>f)break;for(;kb[f];)f++;return yb(e,f).Kf;case 1:case 2:return 0;
case 3:return e.flags;case 4:return f=Rb(),e.flags|=f,0;case 12:return f=Rb(),x[f+0>>1]=2,0;case 13:case 14:return 0}return-28}catch(h){if("undefined"==typeof U||"ErrnoError"!==h.name)throw h;return-h.Cf}},L:function(a,b){try{var c=S(a);return Pb(Eb,c.path,b)}catch(e){if("undefined"==typeof U||"ErrnoError"!==e.name)throw e;return-e.Cf}},n:function(a,b,c){b=Sb(b,c);try{if(isNaN(b))return 61;var e=S(a);if(0===(e.flags&2097155))throw new N(28);Hb(e.node,b);return 0}catch(f){if("undefined"==typeof U||
"ErrnoError"!==f.name)throw f;return-f.Cf}},F:function(a,b){try{if(0===b)return-28;var c=Ua("/")+1;if(b<c)return-68;K("/",w,a,b);return c}catch(e){if("undefined"==typeof U||"ErrnoError"!==e.name)throw e;return-e.Cf}},J:function(a,b){try{return a=a?J(w,a):"",Pb(Fb,a,b)}catch(c){if("undefined"==typeof U||"ErrnoError"!==c.name)throw c;return-c.Cf}},C:function(a,b,c){try{return b=b?J(w,b):"",b=Ob(a,b),b=Na(b),"/"===b[b.length-1]&&(b=b.substr(0,b.length-1)),T(b,c),0}catch(e){if("undefined"==typeof U||
"ErrnoError"!==e.name)throw e;return-e.Cf}},I:function(a,b,c,e){try{b=b?J(w,b):"";var f=e&256;b=Ob(a,b,e&4096);return Pb(f?Fb:Eb,b,c)}catch(h){if("undefined"==typeof U||"ErrnoError"!==h.name)throw h;return-h.Cf}},A:function(a,b,c,e){Qb=e;try{b=b?J(w,b):"";b=Ob(a,b);var f=e?Rb():0;return Ib(b,c,f).Kf}catch(h){if("undefined"==typeof U||"ErrnoError"!==h.name)throw h;return-h.Cf}},y:function(a,b,c,e){try{b=b?J(w,b):"";b=Ob(a,b);if(0>=e)return-28;var f=pb(b),h=Math.min(e,Ua(f)),k=v[c+h];K(f,w,c,e+1);v[c+
h]=k;return h}catch(n){if("undefined"==typeof U||"ErrnoError"!==n.name)throw n;return-n.Cf}},x:function(a){try{return a=a?J(w,a):"",Db(a),0}catch(b){if("undefined"==typeof U||"ErrnoError"!==b.name)throw b;return-b.Cf}},K:function(a,b){try{return a=a?J(w,a):"",Pb(Eb,a,b)}catch(c){if("undefined"==typeof U||"ErrnoError"!==c.name)throw c;return-c.Cf}},u:function(a,b,c){try{b=b?J(w,b):"";b=Ob(a,b);if(0===c){a=b;var e=R(a,{parent:!0}).node;if(!e)throw new N(44);var f=Pa(a),h=fb(e,f),k=wb(e,f,!1);if(k)throw new N(k);
if(!e.zf.ag)throw new N(63);if(h.Of)throw new N(10);e.zf.ag(e,f);sb(h)}else 512===c?Db(b):C("Invalid flags passed to unlinkat");return 0}catch(n){if("undefined"==typeof U||"ErrnoError"!==n.name)throw n;return-n.Cf}},t:function(a,b,c){try{b=b?J(w,b):"";b=Ob(a,b,!0);if(c){var e=B[c>>2]+4294967296*z[c+4>>2],f=z[c+8>>2];h=1E3*e+f/1E6;c+=16;e=B[c>>2]+4294967296*z[c+4>>2];f=z[c+8>>2];k=1E3*e+f/1E6}else var h=Date.now(),k=h;a=h;var n=R(b,{Mf:!0}).node;n.zf.Ef(n,{timestamp:Math.max(a,k)});return 0}catch(l){if("undefined"==
typeof U||"ErrnoError"!==l.name)throw l;return-l.Cf}},k:function(a,b,c){a=new Date(1E3*Sb(a,b));z[c>>2]=a.getSeconds();z[c+4>>2]=a.getMinutes();z[c+8>>2]=a.getHours();z[c+12>>2]=a.getDate();z[c+16>>2]=a.getMonth();z[c+20>>2]=a.getFullYear()-1900;z[c+24>>2]=a.getDay();b=a.getFullYear();z[c+28>>2]=(0!==b%4||0===b%100&&0!==b%400?Ub:Tb)[a.getMonth()]+a.getDate()-1|0;z[c+36>>2]=-(60*a.getTimezoneOffset());b=(new Date(a.getFullYear(),6,1)).getTimezoneOffset();var e=(new Date(a.getFullYear(),0,1)).getTimezoneOffset();
z[c+32>>2]=(b!=e&&a.getTimezoneOffset()==Math.min(e,b))|0},i:function(a,b,c,e,f,h,k,n){f=Sb(f,h);try{if(isNaN(f))return 61;var l=S(e);if(0!==(b&2)&&0===(c&2)&&2!==(l.flags&2097155))throw new N(2);if(1===(l.flags&2097155))throw new N(2);if(!l.Af.Xf)throw new N(43);var m=l.Af.Xf(l,a,f,b,c);var p=m.Bg;z[k>>2]=m.pg;B[n>>2]=p;return 0}catch(q){if("undefined"==typeof U||"ErrnoError"!==q.name)throw q;return-q.Cf}},j:function(a,b,c,e,f,h,k){h=Sb(h,k);try{var n=S(f);if(c&2){if(32768!==(n.node.mode&61440))throw new N(43);
e&2||n.Af.Yf&&n.Af.Yf(n,w.slice(a,a+b),h,b,e)}}catch(l){if("undefined"==typeof U||"ErrnoError"!==l.name)throw l;return-l.Cf}},B:(a,b,c,e)=>{var f=(new Date).getFullYear(),h=(new Date(f,0,1)).getTimezoneOffset();f=(new Date(f,6,1)).getTimezoneOffset();B[a>>2]=60*Math.max(h,f);z[b>>2]=Number(h!=f);b=k=>{var n=Math.abs(k);return`UTC${0<=k?"-":"+"}${String(Math.floor(n/60)).padStart(2,"0")}${String(n%60).padStart(2,"0")}`};a=b(h);b=b(f);f<h?(K(a,w,c,17),K(b,w,e,17)):(K(a,w,e,17),K(b,w,c,17))},e:()=>Date.now(),
d:()=>performance.now(),r:a=>{var b=w.length;a>>>=0;if(2147483648<a)return!1;for(var c=1;4>=c;c*=2){var e=b*(1+.2/c);e=Math.min(e,a+100663296);var f=Math;e=Math.max(a,e);a:{f=(f.min.call(f,2147483648,e+(65536-e%65536)%65536)-oa.buffer.byteLength+65535)/65536;try{oa.grow(f);ta();var h=1;break a}catch(k){}h=void 0}if(h)return!0}return!1},D:(a,b)=>{var c=0;Xb().forEach((e,f)=>{var h=b+c;f=B[a+4*f>>2]=h;for(h=0;h<e.length;++h)v[f++]=e.charCodeAt(h);v[f]=0;c+=e.length+1});return 0},E:(a,b)=>{var c=Xb();
B[a>>2]=c.length;var e=0;c.forEach(f=>e+=f.length+1);B[b>>2]=e;return 0},f:function(a){try{var b=S(a);if(null===b.Kf)throw new N(8);b.cg&&(b.cg=null);try{b.Af.close&&b.Af.close(b)}catch(c){throw c;}finally{kb[b.Kf]=null}b.Kf=null;return 0}catch(c){if("undefined"==typeof U||"ErrnoError"!==c.name)throw c;return c.Cf}},s:function(a,b){try{var c=S(a);v[b]=c.Gf?2:P(c.mode)?3:40960===(c.mode&61440)?7:4;x[b+2>>1]=0;F=[0,(D=0,1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>
0:0)];z[b+8>>2]=F[0];z[b+12>>2]=F[1];F=[0,(D=0,1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:0)];z[b+16>>2]=F[0];z[b+20>>2]=F[1];return 0}catch(e){if("undefined"==typeof U||"ErrnoError"!==e.name)throw e;return e.Cf}},z:function(a,b,c,e){try{a:{var f=S(a);a=b;for(var h,k=b=0;k<c;k++){var n=B[a>>2],l=B[a+4>>2];a+=8;var m=f,p=h,q=v;if(0>l||0>p)throw new N(28);if(null===m.Kf)throw new N(8);if(1===(m.flags&2097155))throw new N(8);if(P(m.node.mode))throw new N(31);
if(!m.Af.read)throw new N(28);var t="undefined"!=typeof p;if(!t)p=m.position;else if(!m.seekable)throw new N(70);var y=m.Af.read(m,q,n,l,p);t||(m.position+=y);var A=y;if(0>A){var G=-1;break a}b+=A;if(A<l)break;"undefined"!=typeof h&&(h+=A)}G=b}B[e>>2]=G;return 0}catch(E){if("undefined"==typeof U||"ErrnoError"!==E.name)throw E;return E.Cf}},m:function(a,b,c,e,f){b=Sb(b,c);try{if(isNaN(b))return 61;var h=S(a);Kb(h,b,e);F=[h.position>>>0,(D=h.position,1<=+Math.abs(D)?0<D?+Math.floor(D/4294967296)>>>
0:~~+Math.ceil((D-+(~~D>>>0))/4294967296)>>>0:0)];z[f>>2]=F[0];z[f+4>>2]=F[1];h.cg&&0===b&&0===e&&(h.cg=null);return 0}catch(k){if("undefined"==typeof U||"ErrnoError"!==k.name)throw k;return k.Cf}},G:function(a){try{var b=S(a);return ad(c=>{var e=b.node.If;e.type.Cg?e.type.Cg(e,!1,f=>{f?c(29):c(0)}):c(0)})}catch(c){if("undefined"==typeof U||"ErrnoError"!==c.name)throw c;return c.Cf}},v:function(a,b,c,e){try{a:{var f=S(a);a=b;for(var h,k=b=0;k<c;k++){var n=B[a>>2],l=B[a+4>>2];a+=8;var m=f,p=n,q=l,
t=h,y=v;if(0>q||0>t)throw new N(28);if(null===m.Kf)throw new N(8);if(0===(m.flags&2097155))throw new N(8);if(P(m.node.mode))throw new N(31);if(!m.Af.write)throw new N(28);m.seekable&&m.flags&1024&&Kb(m,0,2);var A="undefined"!=typeof t;if(!A)t=m.position;else if(!m.seekable)throw new N(70);var G=m.Af.write(m,y,p,q,t,void 0);A||(m.position+=G);var E=G;if(0>E){var M=-1;break a}b+=E;"undefined"!=typeof h&&(h+=E)}M=b}B[e>>2]=M;return 0}catch(L){if("undefined"==typeof U||"ErrnoError"!==L.name)throw L;return L.Cf}},
sa:Yb,P:Zb,ha:$b,ca:ac,Z:bc,la:cc,w:dc,g:ec,oa:fc,ja:gc,ea:hc,fa:ic,h:jc,l:kc,pa:lc,ra:mc,qa:nc,da:oc,ga:pc,ia:qc,na:rc,c:sc,ka:tc,ma:uc,H:function(a,b,c,e){(0,globalThis.__onTablesChanged)?.(a,b,c,e)},aa:vc,V:wc,$:xc,ba:yc,S:zc,U:Ac,Y:Bc,X:Cc,R:Dc,q:Ec,T:Fc,_:Gc,o:Hc,W:Ic,p:Jc},V=function(){function a(c){V=c.exports;V=Pc();oa=V.ta;ta();hd=V.pf;va.unshift(V.ua);za--;d.monitorRunDependencies?.(za);0==za&&(null!==Aa&&(clearInterval(Aa),Aa=null),Ba&&(c=Ba,Ba=null,c()));return V}var b={a:pd};za++;d.monitorRunDependencies?.(za);
if(d.instantiateWasm)try{return d.instantiateWasm(b,a)}catch(c){r(`Module.instantiateWasm callback failed with error: ${c}`),ba(c)}Da||=d.locateFile?Ca("wa-sqlite-async.wasm")?"wa-sqlite-async.wasm":d.locateFile?d.locateFile("wa-sqlite-async.wasm",g):g+"wa-sqlite-async.wasm":(new URL("wa-sqlite-async.wasm",import.meta.url)).href;Ha(b,function(c){a(c.instance)}).catch(ba);return{}}();d._sqlite3_auto_extension=a=>(d._sqlite3_auto_extension=V.va)(a);d._sqlite3_free=a=>(d._sqlite3_free=V.wa)(a);
d._sqlite3_malloc=a=>(d._sqlite3_malloc=V.xa)(a);d._sqlite3_bind_blob=(a,b,c,e,f)=>(d._sqlite3_bind_blob=V.ya)(a,b,c,e,f);d._sqlite3_shutdown=()=>(d._sqlite3_shutdown=V.za)();d._sqlite3_bind_int=(a,b,c)=>(d._sqlite3_bind_int=V.Aa)(a,b,c);d._sqlite3_bind_int64=(a,b,c,e)=>(d._sqlite3_bind_int64=V.Ba)(a,b,c,e);d._sqlite3_bind_double=(a,b,c)=>(d._sqlite3_bind_double=V.Ca)(a,b,c);d._sqlite3_bind_null=(a,b)=>(d._sqlite3_bind_null=V.Da)(a,b);d._sqlite3_clear_bindings=a=>(d._sqlite3_clear_bindings=V.Ea)(a);
d._sqlite3_bind_text=(a,b,c,e,f)=>(d._sqlite3_bind_text=V.Fa)(a,b,c,e,f);d._sqlite3_bind_pointer=(a,b,c,e,f)=>(d._sqlite3_bind_pointer=V.Ga)(a,b,c,e,f);d._sqlite3_bind_value=(a,b,c)=>(d._sqlite3_bind_value=V.Ha)(a,b,c);d._sqlite3_close=a=>(d._sqlite3_close=V.Ia)(a);d._sqlite3_vtab_config=(a,b,c)=>(d._sqlite3_vtab_config=V.Ja)(a,b,c);d._sqlite3_commit_hook=(a,b,c)=>(d._sqlite3_commit_hook=V.Ka)(a,b,c);d._sqlite3_column_type=(a,b)=>(d._sqlite3_column_type=V.La)(a,b);
d._sqlite3_column_count=a=>(d._sqlite3_column_count=V.Ma)(a);d._sqlite3_column_text=(a,b)=>(d._sqlite3_column_text=V.Na)(a,b);d._sqlite3_column_blob=(a,b)=>(d._sqlite3_column_blob=V.Oa)(a,b);d._sqlite3_column_bytes=(a,b)=>(d._sqlite3_column_bytes=V.Pa)(a,b);d._sqlite3_column_value=(a,b)=>(d._sqlite3_column_value=V.Qa)(a,b);d._sqlite3_column_double=(a,b)=>(d._sqlite3_column_double=V.Ra)(a,b);d._sqlite3_column_int=(a,b)=>(d._sqlite3_column_int=V.Sa)(a,b);
d._sqlite3_column_int64=(a,b)=>(d._sqlite3_column_int64=V.Ta)(a,b);d._sqlite3_column_name=(a,b)=>(d._sqlite3_column_name=V.Ua)(a,b);d._sqlite3_context_db_handle=a=>(d._sqlite3_context_db_handle=V.Va)(a);d._sqlite3_create_function_v2=(a,b,c,e,f,h,k,n,l)=>(d._sqlite3_create_function_v2=V.Wa)(a,b,c,e,f,h,k,n,l);d._sqlite3_create_module_v2=(a,b,c,e,f)=>(d._sqlite3_create_module_v2=V.Xa)(a,b,c,e,f);d._sqlite3_declare_vtab=(a,b)=>(d._sqlite3_declare_vtab=V.Ya)(a,b);
d._sqlite3_errcode=a=>(d._sqlite3_errcode=V.Za)(a);d._sqlite3_errmsg=a=>(d._sqlite3_errmsg=V._a)(a);d._sqlite3_exec=(a,b,c,e,f)=>(d._sqlite3_exec=V.$a)(a,b,c,e,f);d._sqlite3_finalize=a=>(d._sqlite3_finalize=V.ab)(a);d._sqlite3_get_auxdata=(a,b)=>(d._sqlite3_get_auxdata=V.bb)(a,b);d._sqlite3_next_stmt=(a,b)=>(d._sqlite3_next_stmt=V.cb)(a,b);d._sqlite3_open=(a,b)=>(d._sqlite3_open=V.db)(a,b);d._sqlite3_prepare_v2=(a,b,c,e,f)=>(d._sqlite3_prepare_v2=V.eb)(a,b,c,e,f);
d._sqlite3_prepare_v3=(a,b,c,e,f,h)=>(d._sqlite3_prepare_v3=V.fb)(a,b,c,e,f,h);d._sqlite3_randomness=(a,b)=>(d._sqlite3_randomness=V.gb)(a,b);d._sqlite3_result_int=(a,b)=>(d._sqlite3_result_int=V.hb)(a,b);d._sqlite3_result_blob=(a,b,c,e)=>(d._sqlite3_result_blob=V.ib)(a,b,c,e);d._sqlite3_result_int64=(a,b,c)=>(d._sqlite3_result_int64=V.jb)(a,b,c);d._sqlite3_result_double=(a,b)=>(d._sqlite3_result_double=V.kb)(a,b);d._sqlite3_result_null=a=>(d._sqlite3_result_null=V.lb)(a);
d._sqlite3_result_pointer=(a,b,c,e)=>(d._sqlite3_result_pointer=V.mb)(a,b,c,e);d._sqlite3_result_error=(a,b,c)=>(d._sqlite3_result_error=V.nb)(a,b,c);d._sqlite3_result_error_code=(a,b)=>(d._sqlite3_result_error_code=V.ob)(a,b);d._sqlite3_result_value=(a,b)=>(d._sqlite3_result_value=V.pb)(a,b);d._sqlite3_result_text=(a,b,c,e)=>(d._sqlite3_result_text=V.qb)(a,b,c,e);d._sqlite3_result_subtype=(a,b)=>(d._sqlite3_result_subtype=V.rb)(a,b);
d._sqlite3_set_authorizer=(a,b,c)=>(d._sqlite3_set_authorizer=V.sb)(a,b,c);d._sqlite3_set_auxdata=(a,b,c,e)=>(d._sqlite3_set_auxdata=V.tb)(a,b,c,e);d._sqlite3_sql=a=>(d._sqlite3_sql=V.ub)(a);d._sqlite3_reset=a=>(d._sqlite3_reset=V.vb)(a);d._sqlite3_value_text=a=>(d._sqlite3_value_text=V.wb)(a);d._sqlite3_value_type=a=>(d._sqlite3_value_type=V.xb)(a);d._sqlite3_value_bytes=a=>(d._sqlite3_value_bytes=V.yb)(a);d._sqlite3_value_blob=a=>(d._sqlite3_value_blob=V.zb)(a);
d._sqlite3_value_int=a=>(d._sqlite3_value_int=V.Ab)(a);d._sqlite3_value_int64=a=>(d._sqlite3_value_int64=V.Bb)(a);d._sqlite3_value_double=a=>(d._sqlite3_value_double=V.Cb)(a);d._sqlite3_value_pointer=(a,b)=>(d._sqlite3_value_pointer=V.Db)(a,b);d._sqlite3_vtab_distinct=a=>(d._sqlite3_vtab_distinct=V.Eb)(a);d._sqlite3_get_autocommit=a=>(d._sqlite3_get_autocommit=V.Fb)(a);d._sqlite3_step=a=>(d._sqlite3_step=V.Gb)(a);d._sqlite3_status64=(a,b,c,e)=>(d._sqlite3_status64=V.Hb)(a,b,c,e);
d._sqlite3_status=(a,b,c,e)=>(d._sqlite3_status=V.Ib)(a,b,c,e);d._sqlite3_db_status=(a,b,c,e,f)=>(d._sqlite3_db_status=V.Jb)(a,b,c,e,f);d._sqlite3_msize=a=>(d._sqlite3_msize=V.Kb)(a);d._sqlite3_vfs_find=a=>(d._sqlite3_vfs_find=V.Lb)(a);d._sqlite3_vfs_register=(a,b)=>(d._sqlite3_vfs_register=V.Mb)(a,b);d._sqlite3_vfs_unregister=a=>(d._sqlite3_vfs_unregister=V.Nb)(a);d._sqlite3_release_memory=a=>(d._sqlite3_release_memory=V.Ob)(a);
d._sqlite3_soft_heap_limit64=(a,b)=>(d._sqlite3_soft_heap_limit64=V.Pb)(a,b);d._sqlite3_memory_used=()=>(d._sqlite3_memory_used=V.Qb)();d._sqlite3_hard_heap_limit64=(a,b)=>(d._sqlite3_hard_heap_limit64=V.Rb)(a,b);d._sqlite3_memory_highwater=a=>(d._sqlite3_memory_highwater=V.Sb)(a);d._sqlite3_malloc64=(a,b)=>(d._sqlite3_malloc64=V.Tb)(a,b);d._sqlite3_realloc=(a,b)=>(d._sqlite3_realloc=V.Ub)(a,b);d._sqlite3_realloc64=(a,b,c)=>(d._sqlite3_realloc64=V.Vb)(a,b,c);
d._sqlite3_str_vappendf=(a,b,c)=>(d._sqlite3_str_vappendf=V.Wb)(a,b,c);d._sqlite3_str_append=(a,b,c)=>(d._sqlite3_str_append=V.Xb)(a,b,c);d._sqlite3_str_appendchar=(a,b,c)=>(d._sqlite3_str_appendchar=V.Yb)(a,b,c);d._sqlite3_str_appendall=(a,b)=>(d._sqlite3_str_appendall=V.Zb)(a,b);d._sqlite3_str_appendf=(a,b,c)=>(d._sqlite3_str_appendf=V._b)(a,b,c);d._sqlite3_str_finish=a=>(d._sqlite3_str_finish=V.$b)(a);d._sqlite3_str_errcode=a=>(d._sqlite3_str_errcode=V.ac)(a);
d._sqlite3_str_length=a=>(d._sqlite3_str_length=V.bc)(a);d._sqlite3_str_value=a=>(d._sqlite3_str_value=V.cc)(a);d._sqlite3_str_reset=a=>(d._sqlite3_str_reset=V.dc)(a);d._sqlite3_str_new=a=>(d._sqlite3_str_new=V.ec)(a);d._sqlite3_vmprintf=(a,b)=>(d._sqlite3_vmprintf=V.fc)(a,b);d._sqlite3_mprintf=(a,b)=>(d._sqlite3_mprintf=V.gc)(a,b);d._sqlite3_vsnprintf=(a,b,c,e)=>(d._sqlite3_vsnprintf=V.hc)(a,b,c,e);d._sqlite3_snprintf=(a,b,c,e)=>(d._sqlite3_snprintf=V.ic)(a,b,c,e);
d._sqlite3_log=(a,b,c)=>(d._sqlite3_log=V.jc)(a,b,c);d._sqlite3_stricmp=(a,b)=>(d._sqlite3_stricmp=V.kc)(a,b);d._sqlite3_strnicmp=(a,b,c)=>(d._sqlite3_strnicmp=V.lc)(a,b,c);d._sqlite3_os_init=()=>(d._sqlite3_os_init=V.mc)();d._sqlite3_os_end=()=>(d._sqlite3_os_end=V.nc)();d._sqlite3_serialize=(a,b,c,e)=>(d._sqlite3_serialize=V.oc)(a,b,c,e);d._sqlite3_deserialize=(a,b,c,e,f,h,k,n)=>(d._sqlite3_deserialize=V.pc)(a,b,c,e,f,h,k,n);d._sqlite3_database_file_object=a=>(d._sqlite3_database_file_object=V.qc)(a);
d._sqlite3_backup_init=(a,b,c,e)=>(d._sqlite3_backup_init=V.rc)(a,b,c,e);d._sqlite3_backup_step=(a,b)=>(d._sqlite3_backup_step=V.sc)(a,b);d._sqlite3_backup_finish=a=>(d._sqlite3_backup_finish=V.tc)(a);d._sqlite3_backup_remaining=a=>(d._sqlite3_backup_remaining=V.uc)(a);d._sqlite3_backup_pagecount=a=>(d._sqlite3_backup_pagecount=V.vc)(a);d._sqlite3_value_bytes16=a=>(d._sqlite3_value_bytes16=V.wc)(a);d._sqlite3_value_subtype=a=>(d._sqlite3_value_subtype=V.xc)(a);
d._sqlite3_value_text16=a=>(d._sqlite3_value_text16=V.yc)(a);d._sqlite3_value_text16be=a=>(d._sqlite3_value_text16be=V.zc)(a);d._sqlite3_value_text16le=a=>(d._sqlite3_value_text16le=V.Ac)(a);d._sqlite3_value_encoding=a=>(d._sqlite3_value_encoding=V.Bc)(a);d._sqlite3_value_nochange=a=>(d._sqlite3_value_nochange=V.Cc)(a);d._sqlite3_value_frombind=a=>(d._sqlite3_value_frombind=V.Dc)(a);d._sqlite3_value_dup=a=>(d._sqlite3_value_dup=V.Ec)(a);d._sqlite3_value_free=a=>(d._sqlite3_value_free=V.Fc)(a);
d._sqlite3_result_blob64=(a,b,c,e,f)=>(d._sqlite3_result_blob64=V.Gc)(a,b,c,e,f);d._sqlite3_result_error16=(a,b,c)=>(d._sqlite3_result_error16=V.Hc)(a,b,c);d._sqlite3_result_text64=(a,b,c,e,f,h)=>(d._sqlite3_result_text64=V.Ic)(a,b,c,e,f,h);d._sqlite3_result_text16=(a,b,c,e)=>(d._sqlite3_result_text16=V.Jc)(a,b,c,e);d._sqlite3_result_text16be=(a,b,c,e)=>(d._sqlite3_result_text16be=V.Kc)(a,b,c,e);d._sqlite3_result_text16le=(a,b,c,e)=>(d._sqlite3_result_text16le=V.Lc)(a,b,c,e);
d._sqlite3_result_error_toobig=a=>(d._sqlite3_result_error_toobig=V.Mc)(a);d._sqlite3_result_zeroblob=(a,b)=>(d._sqlite3_result_zeroblob=V.Nc)(a,b);d._sqlite3_result_zeroblob64=(a,b,c)=>(d._sqlite3_result_zeroblob64=V.Oc)(a,b,c);d._sqlite3_result_error_nomem=a=>(d._sqlite3_result_error_nomem=V.Pc)(a);d._sqlite3_user_data=a=>(d._sqlite3_user_data=V.Qc)(a);d._sqlite3_vtab_nochange=a=>(d._sqlite3_vtab_nochange=V.Rc)(a);d._sqlite3_vtab_in_first=(a,b)=>(d._sqlite3_vtab_in_first=V.Sc)(a,b);
d._sqlite3_vtab_in_next=(a,b)=>(d._sqlite3_vtab_in_next=V.Tc)(a,b);d._sqlite3_aggregate_context=(a,b)=>(d._sqlite3_aggregate_context=V.Uc)(a,b);d._sqlite3_data_count=a=>(d._sqlite3_data_count=V.Vc)(a);d._sqlite3_column_bytes16=(a,b)=>(d._sqlite3_column_bytes16=V.Wc)(a,b);d._sqlite3_column_text16=(a,b)=>(d._sqlite3_column_text16=V.Xc)(a,b);d._sqlite3_column_name16=(a,b)=>(d._sqlite3_column_name16=V.Yc)(a,b);d._sqlite3_bind_blob64=(a,b,c,e,f,h)=>(d._sqlite3_bind_blob64=V.Zc)(a,b,c,e,f,h);
d._sqlite3_bind_text64=(a,b,c,e,f,h,k)=>(d._sqlite3_bind_text64=V._c)(a,b,c,e,f,h,k);d._sqlite3_bind_text16=(a,b,c,e,f)=>(d._sqlite3_bind_text16=V.$c)(a,b,c,e,f);d._sqlite3_bind_zeroblob=(a,b,c)=>(d._sqlite3_bind_zeroblob=V.ad)(a,b,c);d._sqlite3_bind_zeroblob64=(a,b,c,e)=>(d._sqlite3_bind_zeroblob64=V.bd)(a,b,c,e);d._sqlite3_bind_parameter_count=a=>(d._sqlite3_bind_parameter_count=V.cd)(a);d._sqlite3_bind_parameter_name=(a,b)=>(d._sqlite3_bind_parameter_name=V.dd)(a,b);
d._sqlite3_bind_parameter_index=(a,b)=>(d._sqlite3_bind_parameter_index=V.ed)(a,b);d._sqlite3_db_handle=a=>(d._sqlite3_db_handle=V.fd)(a);d._sqlite3_stmt_readonly=a=>(d._sqlite3_stmt_readonly=V.gd)(a);d._sqlite3_stmt_isexplain=a=>(d._sqlite3_stmt_isexplain=V.hd)(a);d._sqlite3_stmt_explain=(a,b)=>(d._sqlite3_stmt_explain=V.id)(a,b);d._sqlite3_stmt_busy=a=>(d._sqlite3_stmt_busy=V.jd)(a);d._sqlite3_stmt_status=(a,b,c)=>(d._sqlite3_stmt_status=V.kd)(a,b,c);
d._sqlite3_expanded_sql=a=>(d._sqlite3_expanded_sql=V.ld)(a);d._sqlite3_value_numeric_type=a=>(d._sqlite3_value_numeric_type=V.md)(a);d._sqlite3_blob_open=(a,b,c,e,f,h,k,n)=>(d._sqlite3_blob_open=V.nd)(a,b,c,e,f,h,k,n);d._sqlite3_blob_close=a=>(d._sqlite3_blob_close=V.od)(a);d._sqlite3_blob_read=(a,b,c,e)=>(d._sqlite3_blob_read=V.pd)(a,b,c,e);d._sqlite3_blob_write=(a,b,c,e)=>(d._sqlite3_blob_write=V.qd)(a,b,c,e);d._sqlite3_blob_bytes=a=>(d._sqlite3_blob_bytes=V.rd)(a);
d._sqlite3_blob_reopen=(a,b,c)=>(d._sqlite3_blob_reopen=V.sd)(a,b,c);d._sqlite3_strglob=(a,b)=>(d._sqlite3_strglob=V.td)(a,b);d._sqlite3_strlike=(a,b,c)=>(d._sqlite3_strlike=V.ud)(a,b,c);d._sqlite3_cancel_auto_extension=a=>(d._sqlite3_cancel_auto_extension=V.vd)(a);d._sqlite3_reset_auto_extension=()=>(d._sqlite3_reset_auto_extension=V.wd)();d._sqlite3_prepare=(a,b,c,e,f)=>(d._sqlite3_prepare=V.xd)(a,b,c,e,f);d._sqlite3_prepare16=(a,b,c,e,f)=>(d._sqlite3_prepare16=V.yd)(a,b,c,e,f);
d._sqlite3_prepare16_v2=(a,b,c,e,f)=>(d._sqlite3_prepare16_v2=V.zd)(a,b,c,e,f);d._sqlite3_prepare16_v3=(a,b,c,e,f,h)=>(d._sqlite3_prepare16_v3=V.Ad)(a,b,c,e,f,h);d._sqlite3_get_table=(a,b,c,e,f,h)=>(d._sqlite3_get_table=V.Bd)(a,b,c,e,f,h);d._sqlite3_free_table=a=>(d._sqlite3_free_table=V.Cd)(a);d._sqlite3_create_module=(a,b,c,e)=>(d._sqlite3_create_module=V.Dd)(a,b,c,e);d._sqlite3_drop_modules=(a,b)=>(d._sqlite3_drop_modules=V.Ed)(a,b);d._sqlite3_vtab_on_conflict=a=>(d._sqlite3_vtab_on_conflict=V.Fd)(a);
d._sqlite3_vtab_collation=(a,b)=>(d._sqlite3_vtab_collation=V.Gd)(a,b);d._sqlite3_vtab_in=(a,b,c)=>(d._sqlite3_vtab_in=V.Hd)(a,b,c);d._sqlite3_vtab_rhs_value=(a,b,c)=>(d._sqlite3_vtab_rhs_value=V.Id)(a,b,c);d._sqlite3_keyword_name=(a,b,c)=>(d._sqlite3_keyword_name=V.Jd)(a,b,c);d._sqlite3_keyword_count=()=>(d._sqlite3_keyword_count=V.Kd)();d._sqlite3_keyword_check=(a,b)=>(d._sqlite3_keyword_check=V.Ld)(a,b);d._sqlite3_complete=a=>(d._sqlite3_complete=V.Md)(a);
d._sqlite3_complete16=a=>(d._sqlite3_complete16=V.Nd)(a);d._sqlite3_libversion=()=>(d._sqlite3_libversion=V.Od)();d._sqlite3_libversion_number=()=>(d._sqlite3_libversion_number=V.Pd)();d._sqlite3_threadsafe=()=>(d._sqlite3_threadsafe=V.Qd)();d._sqlite3_initialize=()=>(d._sqlite3_initialize=V.Rd)();d._sqlite3_config=(a,b)=>(d._sqlite3_config=V.Sd)(a,b);d._sqlite3_db_mutex=a=>(d._sqlite3_db_mutex=V.Td)(a);d._sqlite3_db_release_memory=a=>(d._sqlite3_db_release_memory=V.Ud)(a);
d._sqlite3_db_cacheflush=a=>(d._sqlite3_db_cacheflush=V.Vd)(a);d._sqlite3_db_config=(a,b,c)=>(d._sqlite3_db_config=V.Wd)(a,b,c);d._sqlite3_last_insert_rowid=a=>(d._sqlite3_last_insert_rowid=V.Xd)(a);d._sqlite3_set_last_insert_rowid=(a,b,c)=>(d._sqlite3_set_last_insert_rowid=V.Yd)(a,b,c);d._sqlite3_changes64=a=>(d._sqlite3_changes64=V.Zd)(a);d._sqlite3_changes=a=>(d._sqlite3_changes=V._d)(a);d._sqlite3_total_changes64=a=>(d._sqlite3_total_changes64=V.$d)(a);
d._sqlite3_total_changes=a=>(d._sqlite3_total_changes=V.ae)(a);d._sqlite3_txn_state=(a,b)=>(d._sqlite3_txn_state=V.be)(a,b);d._sqlite3_close_v2=a=>(d._sqlite3_close_v2=V.ce)(a);d._sqlite3_busy_handler=(a,b,c)=>(d._sqlite3_busy_handler=V.de)(a,b,c);d._sqlite3_progress_handler=(a,b,c,e)=>(d._sqlite3_progress_handler=V.ee)(a,b,c,e);d._sqlite3_busy_timeout=(a,b)=>(d._sqlite3_busy_timeout=V.fe)(a,b);d._sqlite3_interrupt=a=>(d._sqlite3_interrupt=V.ge)(a);
d._sqlite3_is_interrupted=a=>(d._sqlite3_is_interrupted=V.he)(a);d._sqlite3_create_function=(a,b,c,e,f,h,k,n)=>(d._sqlite3_create_function=V.ie)(a,b,c,e,f,h,k,n);d._sqlite3_create_window_function=(a,b,c,e,f,h,k,n,l,m)=>(d._sqlite3_create_window_function=V.je)(a,b,c,e,f,h,k,n,l,m);d._sqlite3_create_function16=(a,b,c,e,f,h,k,n)=>(d._sqlite3_create_function16=V.ke)(a,b,c,e,f,h,k,n);d._sqlite3_overload_function=(a,b,c)=>(d._sqlite3_overload_function=V.le)(a,b,c);
d._sqlite3_trace_v2=(a,b,c,e)=>(d._sqlite3_trace_v2=V.me)(a,b,c,e);d._sqlite3_update_hook=(a,b,c)=>(d._sqlite3_update_hook=V.ne)(a,b,c);d._sqlite3_rollback_hook=(a,b,c)=>(d._sqlite3_rollback_hook=V.oe)(a,b,c);d._sqlite3_autovacuum_pages=(a,b,c,e)=>(d._sqlite3_autovacuum_pages=V.pe)(a,b,c,e);d._sqlite3_wal_autocheckpoint=(a,b)=>(d._sqlite3_wal_autocheckpoint=V.qe)(a,b);d._sqlite3_wal_hook=(a,b,c)=>(d._sqlite3_wal_hook=V.re)(a,b,c);
d._sqlite3_wal_checkpoint_v2=(a,b,c,e,f)=>(d._sqlite3_wal_checkpoint_v2=V.se)(a,b,c,e,f);d._sqlite3_wal_checkpoint=(a,b)=>(d._sqlite3_wal_checkpoint=V.te)(a,b);d._sqlite3_error_offset=a=>(d._sqlite3_error_offset=V.ue)(a);d._sqlite3_errmsg16=a=>(d._sqlite3_errmsg16=V.ve)(a);d._sqlite3_extended_errcode=a=>(d._sqlite3_extended_errcode=V.we)(a);d._sqlite3_system_errno=a=>(d._sqlite3_system_errno=V.xe)(a);d._sqlite3_errstr=a=>(d._sqlite3_errstr=V.ye)(a);
d._sqlite3_limit=(a,b,c)=>(d._sqlite3_limit=V.ze)(a,b,c);d._sqlite3_open_v2=(a,b,c,e)=>(d._sqlite3_open_v2=V.Ae)(a,b,c,e);d._sqlite3_open16=(a,b)=>(d._sqlite3_open16=V.Be)(a,b);d._sqlite3_create_collation=(a,b,c,e,f)=>(d._sqlite3_create_collation=V.Ce)(a,b,c,e,f);d._sqlite3_create_collation_v2=(a,b,c,e,f,h)=>(d._sqlite3_create_collation_v2=V.De)(a,b,c,e,f,h);d._sqlite3_create_collation16=(a,b,c,e,f)=>(d._sqlite3_create_collation16=V.Ee)(a,b,c,e,f);
d._sqlite3_collation_needed=(a,b,c)=>(d._sqlite3_collation_needed=V.Fe)(a,b,c);d._sqlite3_collation_needed16=(a,b,c)=>(d._sqlite3_collation_needed16=V.Ge)(a,b,c);d._sqlite3_get_clientdata=(a,b)=>(d._sqlite3_get_clientdata=V.He)(a,b);d._sqlite3_set_clientdata=(a,b,c,e)=>(d._sqlite3_set_clientdata=V.Ie)(a,b,c,e);d._sqlite3_table_column_metadata=(a,b,c,e,f,h,k,n,l)=>(d._sqlite3_table_column_metadata=V.Je)(a,b,c,e,f,h,k,n,l);d._sqlite3_sleep=a=>(d._sqlite3_sleep=V.Ke)(a);
d._sqlite3_extended_result_codes=(a,b)=>(d._sqlite3_extended_result_codes=V.Le)(a,b);d._sqlite3_file_control=(a,b,c,e)=>(d._sqlite3_file_control=V.Me)(a,b,c,e);d._sqlite3_test_control=(a,b)=>(d._sqlite3_test_control=V.Ne)(a,b);d._sqlite3_create_filename=(a,b,c,e,f)=>(d._sqlite3_create_filename=V.Oe)(a,b,c,e,f);d._sqlite3_free_filename=a=>(d._sqlite3_free_filename=V.Pe)(a);d._sqlite3_uri_parameter=(a,b)=>(d._sqlite3_uri_parameter=V.Qe)(a,b);d._sqlite3_uri_key=(a,b)=>(d._sqlite3_uri_key=V.Re)(a,b);
d._sqlite3_uri_boolean=(a,b,c)=>(d._sqlite3_uri_boolean=V.Se)(a,b,c);d._sqlite3_uri_int64=(a,b,c,e)=>(d._sqlite3_uri_int64=V.Te)(a,b,c,e);d._sqlite3_filename_database=a=>(d._sqlite3_filename_database=V.Ue)(a);d._sqlite3_filename_journal=a=>(d._sqlite3_filename_journal=V.Ve)(a);d._sqlite3_filename_wal=a=>(d._sqlite3_filename_wal=V.We)(a);d._sqlite3_db_name=(a,b)=>(d._sqlite3_db_name=V.Xe)(a,b);d._sqlite3_db_filename=(a,b)=>(d._sqlite3_db_filename=V.Ye)(a,b);
d._sqlite3_db_readonly=(a,b)=>(d._sqlite3_db_readonly=V.Ze)(a,b);d._sqlite3_compileoption_used=a=>(d._sqlite3_compileoption_used=V._e)(a);d._sqlite3_compileoption_get=a=>(d._sqlite3_compileoption_get=V.$e)(a);d._sqlite3_sourceid=()=>(d._sqlite3_sourceid=V.af)();var $c=d._malloc=a=>($c=d._malloc=V.bf)(a),ed=d._free=a=>(ed=d._free=V.cf)(a);d._RegisterExtensionFunctions=a=>(d._RegisterExtensionFunctions=V.df)(a);d._set_authorizer=a=>(d._set_authorizer=V.ef)(a);
d._create_function=(a,b,c,e,f,h)=>(d._create_function=V.ff)(a,b,c,e,f,h);d._on_tables_changed=(a,b,c,e,f,h)=>(d._on_tables_changed=V.gf)(a,b,c,e,f,h);d._register_table_update_hook=a=>(d._register_table_update_hook=V.hf)(a);d._create_module=(a,b,c,e)=>(d._create_module=V.jf)(a,b,c,e);d._progress_handler=(a,b)=>(d._progress_handler=V.kf)(a,b);d._register_vfs=(a,b,c,e)=>(d._register_vfs=V.lf)(a,b,c,e);d._getSqliteFree=()=>(d._getSqliteFree=V.mf)();var qd=d._main=(a,b)=>(qd=d._main=V.nf)(a,b);
d._setup_powersync=()=>(d._setup_powersync=V.of)();var gb=(a,b)=>(gb=V.qf)(a,b),rd=()=>(rd=V.rf)(),ld=a=>(ld=V.sf)(a),md=a=>(md=V.tf)(a),nd=()=>(nd=V.uf)(),cd=a=>(cd=V.vf)(a),Rc=()=>(Rc=V.wf)(),bd=a=>(bd=V.xf)(a),dd=()=>(dd=V.yf)();d._sqlite3_version=46872;d.getTempRet0=()=>rd();d.ccall=Z;d.cwrap=(a,b,c,e)=>{var f=!c||c.every(h=>"number"===h||"boolean"===h);return"string"!==b&&f&&!e?d["_"+a]:(...h)=>Z(a,b,c,h,e)};
d.addFunction=(a,b)=>{if(!jd){jd=new WeakMap;var c=hd.length;if(jd)for(var e=0;e<0+c;e++){var f=hd.get(e);f&&jd.set(f,e)}}if(c=jd.get(a)||0)return c;if(kd.length)c=kd.pop();else{try{hd.grow(1)}catch(n){if(!(n instanceof RangeError))throw n;throw"Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";}c=hd.length-1}try{hd.set(c,a)}catch(n){if(!(n instanceof TypeError))throw n;if("function"==typeof WebAssembly.Function){e=WebAssembly.Function;f={i:"i32",j:"i64",f:"f32",d:"f64",e:"externref",p:"i32"};for(var h=
{parameters:[],results:"v"==b[0]?[]:[f[b[0]]]},k=1;k<b.length;++k)h.parameters.push(f[b[k]]);b=new e(h,a)}else{e=[1];f=b.slice(0,1);b=b.slice(1);h={i:127,p:127,j:126,f:125,d:124,e:111};e.push(96);k=b.length;128>k?e.push(k):e.push(k%128|128,k>>7);for(k=0;k<b.length;++k)e.push(h[b[k]]);"v"==f?e.push(0):e.push(1,h[f]);b=[0,97,115,109,1,0,0,0,1];f=e.length;128>f?b.push(f):b.push(f%128|128,f>>7);b.push(...e);b.push(2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);b=new WebAssembly.Module(new Uint8Array(b));b=(new WebAssembly.Instance(b,
{e:{f:a}})).exports.f}hd.set(c,b)}jd.set(a,c);return c};d.setValue=I;d.getValue=H;d.UTF8ToString=(a,b)=>a?J(w,a,b):"";d.stringToUTF8=(a,b,c)=>K(a,w,b,c);d.lengthBytesUTF8=Ua;d.intArrayFromString=Va;d.intArrayToString=function(a){for(var b=[],c=0;c<a.length;c++){var e=a[c];255<e&&(e&=255);b.push(String.fromCharCode(e))}return b.join("")};d.AsciiToString=a=>{for(var b="";;){var c=w[a++];if(!c)return b;b+=String.fromCharCode(c)}};
d.UTF16ToString=(a,b)=>{var c=a>>1;for(var e=c+b/2;!(c>=e)&&qa[c];)++c;c<<=1;if(32<c-a&&od)return od.decode(w.subarray(a,c));c="";for(e=0;!(e>=b/2);++e){var f=x[a+2*e>>1];if(0==f)break;c+=String.fromCharCode(f)}return c};d.stringToUTF16=(a,b,c)=>{c??=2147483647;if(2>c)return 0;c-=2;var e=b;c=c<2*a.length?c/2:a.length;for(var f=0;f<c;++f)x[b>>1]=a.charCodeAt(f),b+=2;x[b>>1]=0;return b-e};
d.UTF32ToString=(a,b)=>{for(var c=0,e="";!(c>=b/4);){var f=z[a+4*c>>2];if(0==f)break;++c;65536<=f?(f-=65536,e+=String.fromCharCode(55296|f>>10,56320|f&1023)):e+=String.fromCharCode(f)}return e};d.stringToUTF32=(a,b,c)=>{c??=2147483647;if(4>c)return 0;var e=b;c=e+c-4;for(var f=0;f<a.length;++f){var h=a.charCodeAt(f);if(55296<=h&&57343>=h){var k=a.charCodeAt(++f);h=65536+((h&1023)<<10)|k&1023}z[b>>2]=h;b+=4;if(b+4>c)break}z[b>>2]=0;return b-e};d.writeArrayToMemory=(a,b)=>{v.set(a,b)};var sd;
Ba=function td(){sd||ud();sd||(Ba=td)};
function ud(){function a(){if(!sd&&(sd=!0,d.calledRun=!0,!u)){d.noFSInit||Lb||(Lb=!0,d.stdin=d.stdin,d.stdout=d.stdout,d.stderr=d.stderr,d.stdin?Mb("stdin",d.stdin):Cb("/dev/tty","/dev/stdin"),d.stdout?Mb("stdout",null,d.stdout):Cb("/dev/tty","/dev/stdout"),d.stderr?Mb("stderr",null,d.stderr):Cb("/dev/tty1","/dev/stderr"),Ib("/dev/stdin",0),Ib("/dev/stdout",1),Ib("/dev/stderr",1));mb=!1;Ja(va);Ja(wa);aa(d);d.onRuntimeInitialized?.();if(vd){var b=qd;try{var c=b(0,0);pa=c;Lc(c)}catch(e){Mc(e)}}if(d.postRun)for("function"==
typeof d.postRun&&(d.postRun=[d.postRun]);d.postRun.length;)b=d.postRun.shift(),xa.unshift(b);Ja(xa)}}if(!(0<za)){if(d.preRun)for("function"==typeof d.preRun&&(d.preRun=[d.preRun]);d.preRun.length;)ya();Ja(ua);0<za||(d.setStatus?(d.setStatus("Running..."),setTimeout(function(){setTimeout(function(){d.setStatus("")},1);a()},1)):a())}}if(d.preInit)for("function"==typeof d.preInit&&(d.preInit=[d.preInit]);0<d.preInit.length;)d.preInit.pop()();var vd=!0;d.noInitialRun&&(vd=!1);ud();moduleRtn=ca;


  return moduleRtn;
}
);
>>>>>>> master
})();
export default Module;

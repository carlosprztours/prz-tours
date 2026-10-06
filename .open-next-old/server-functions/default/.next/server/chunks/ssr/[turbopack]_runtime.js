var RUNTIME_PUBLIC_PATH = "server/chunks/ssr/[turbopack]_runtime.js";
var RELATIVE_ROOT_PATH = "..";
var ASSET_PREFIX = "/_next/";
// Apply forwarded globals from workerData if running in a worker thread
if (typeof require !== 'undefined') {
    try {
        var { workerData } = require('worker_threads');
        if (workerData?.__turbopack_globals__) {
            Object.assign(globalThis, workerData.__turbopack_globals__);
            // Remove internal data so it's not visible to user code
            delete workerData.__turbopack_globals__;
        }
    } catch (_) {
        // Not in a worker thread context, ignore
    }
}
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
/// <reference path="./async-module.ts" />
/**
 * Describes why a module was instantiated.
 * Shared between browser and Node.js runtimes.
 */ var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    /**
   * The module was instantiated because it was included in a chunk's hot module
   * update.
   * SourceData is an array of ModuleIds or undefined.
   */ SourceType[SourceType["Update"] = 2] = "Update";
    return SourceType;
}(SourceType || {});
/**
 * Flag indicating which module object type to create when a module is merged. Set to `true`
 * by each runtime that uses ModuleWithDirection (browser dev-base.ts, nodejs dev-base.ts,
 * nodejs build-base.ts). Browser production (build-base.ts) leaves it as `false` since it
 * uses plain Module objects.
 */ let createModuleWithDirectionFlag = false;
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache[id];
    if (!module) {
        if (createModuleWithDirectionFlag) {
            // set in development modes for hmr support
            module = createModuleWithDirection(id);
        } else {
            module = createModuleObject(id);
        }
        moduleCache[id] = module;
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
function createModuleWithDirection(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined,
        parents: [],
        children: []
    };
}
const BindingTag_Value = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings, dynamic) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    // The properties defined above are already non-configurable and
    // non-writable, so the namespace's existing exports are effectively
    // immutable. Sealing additionally makes the object non-extensible, matching
    // real ESM-namespace semantics. Modules with dynamic re-exports
    // (`export *` from a CommonJS module) must stay extensible so the dynamic
    // export proxy can surface keys discovered at runtime, so skip the seal for
    // them.
    if (!dynamic) Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id, dynamic) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings, dynamic);
}
contextPrototype.s = esmExport;
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        // Returns the re-exported object that provides `prop` as an own property,
        // or `undefined` if none does. The traps share this logic so they always
        // agree on which keys are synthesized from `reexportedObjects`. `default`
        // is never re-exported by `export *`, so it is never synthesized.
        const reexportOwning = (prop)=>{
            if (prop !== 'default') {
                for (const obj of reexportedObjects){
                    if (hasOwnProperty.call(obj, prop)) return obj;
                }
            }
            return undefined;
        };
        // Modules with dynamic re-exports are not sealed by `esm()`, so the
        // target beneath the namespace stays extensible. That is what lets the
        // `ownKeys` and `getOwnPropertyDescriptor` traps legally report keys that
        // exist on `reexportedObjects` but not on the target itself.
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                const obj = reexportOwning(prop);
                return obj && Reflect.get(obj, prop);
            },
            // The namespace is read-only, like a real esm namespace object. The
            // re-exported modules can still mutate their own exports (exposed live
            // via `get`), but mutating the namespace itself is rejected. Refusing
            // here, rather than forwarding to the extensible target, also prevents an
            // assignment/definition from shadowing a dynamic re-export. It also
            // prevents delete from removing a static export.
            set () {
                return false;
            },
            defineProperty () {
                return false;
            },
            deleteProperty () {
                return false;
            },
            // The `has` trap ensures that `'exportName' in starImports` will reflect
            // the truth of whether a key is exported.
            has (target, prop) {
                if (Reflect.has(target, prop)) return true;
                if (prop === 'default' || prop === '__esModule') return false;
                return reexportOwning(prop) !== undefined;
            },
            // ownKeys and getOwnPropertyDescriptor together make the keys enumerable.
            // If a value is returned from `ownKeys` but its property descriptor is
            // not enumerable, it will not be visible to iterator methods.
            // Collectively, they allow code like the following:
            //
            // ```
            // // module.js re-exports dynamic CJS exports
            // export * from './legacyModule.cjs'
            //
            // // from another JS file, reference the re-exported dynamic values
            // import * as Namespace from './module.js'
            // Object.keys(Namespace)
            // ```
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            },
            getOwnPropertyDescriptor (target, prop) {
                const own = Reflect.getOwnPropertyDescriptor(target, prop);
                if (own || prop === 'default' || prop === '__esModule') return own;
                const obj = reexportOwning(prop);
                if (obj) {
                    // Synthetic keys don't exist on the target, so they MUST be
                    // reported as configurable. However the set/delete traps above will
                    // prevent them from actually being changed
                    return {
                        enumerable: true,
                        configurable: true,
                        get: ()=>Reflect.get(obj, prop)
                    };
                }
                return undefined;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Install the factory for each module ID that doesn't already have one.
        // When some IDs in this group already have a factory, reuse that existing
        // group factory for the missing IDs to keep all IDs in the group consistent.
        // Otherwise, install the factory from this chunk.
        const moduleFactoryFn = chunkModules[end];
        let existingGroupFactory = undefined;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            const existingFactory = moduleFactories.get(id);
            if (existingFactory) {
                existingGroupFactory = existingFactory;
                break;
            }
        }
        const factoryToInstall = existingGroupFactory ?? moduleFactoryFn;
        let didInstallFactory = false;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            if (!moduleFactories.has(id)) {
                if (!didInstallFactory) {
                    if (factoryToInstall === moduleFactoryFn) {
                        applyModuleFactoryName(moduleFactoryFn);
                    }
                    didInstallFactory = true;
                }
                moduleFactories.set(id, factoryToInstall);
                newModuleId?.(id);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * Constructs an error message for when a module factory is not available.
 */ function factoryNotAvailableMessage(moduleId, sourceType, sourceData) {
    let instantiationReason;
    switch(sourceType){
        case 0:
            instantiationReason = `as a runtime entry of chunk ${sourceData}`;
            break;
        case 1:
            instantiationReason = `because it was required from module ${sourceData}`;
            break;
        case 2:
            instantiationReason = 'because of an HMR update';
            break;
        default:
            invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
    }
    return `Module ${moduleId} was instantiated ${instantiationReason}, but the module factory is not available.`;
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="../shared/runtime/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/**
 * Returns an absolute `file://` URL for the given module path.
 *
 * Uses `url.pathToFileURL` so that the resulting URL is a valid file URI on
 * all platforms (forward slashes on Windows, drive letters handled
 * correctly, path segments URL-encoded).
 */ function resolveFileUrl(modulePath) {
    return require('url').pathToFileURL(resolveAbsolutePath(modulePath)).href;
}
Context.prototype.F = resolveFileUrl;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../../shared/runtime/runtime-utils.ts" />
/// <reference path="../../shared-node/base-externals-utils.ts" />
/// <reference path="../../shared-node/node-externals-utils.ts" />
/// <reference path="./nodejs-globals.d.ts" />
/**
 * Base Node.js runtime shared between production and development.
 * Contains chunk loading, module caching, and other non-HMR functionality.
 */ process.env.TURBOPACK = '1';
const url = require('url');
const moduleFactories = new Map();
const moduleCache = Object.create(null);
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
/**
 * Exports a URL value. No suffix is added in Node.js runtime.
 */ function exportUrl(urlValue, id) {
    exportValue.call(this, urlValue, id);
}
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
    loadedChunks.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
// Shared runtime primitive: the root that on-disk chunk paths are resolved
// against. Used by the bundled wasm helper (exposed as `__turbopack_runtime_root__`).
contextPrototype.w = RUNTIME_ROOT;
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-base.ts" />
/**
 * Production Node.js runtime.
 * Uses ModuleWithDirection and simple module instantiation without HMR support.
 */ // moduleCache and moduleFactories are declared in runtime-base.ts
// this is read in runtime-utils.ts so it creates a module with direction for hmr
createModuleWithDirectionFlag = true;
const nodeContextPrototype = Context.prototype;
nodeContextPrototype.q = exportUrl;
nodeContextPrototype.M = moduleFactories;
// Cast moduleCache to ModuleWithDirection for production mode
nodeContextPrototype.c = moduleCache;
nodeContextPrototype.R = resolvePathFromModule;
nodeContextPrototype.C = clearChunkCache;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        throw new Error(factoryNotAvailableMessage(id, sourceType, sourceData));
    }
    const module1 = createModuleWithDirection(id);
    const exports = module1.exports;
    moduleCache[id] = module1;
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    ;
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, SourceType.Parent, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, SourceType.Runtime, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/[externals]__09-6mei._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[externals]__09-6mei._.js");
      case "server/chunks/[root-of-the-server]__1d3nh5d._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1d3nh5d._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/ssr/[root-of-the-server]__010485j._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__010485j._.js");
      case "server/chunks/ssr/[root-of-the-server]__0d7i_jx._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0d7i_jx._.js");
      case "server/chunks/ssr/[root-of-the-server]__0j4ma68._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0j4ma68._.js");
      case "server/chunks/ssr/[root-of-the-server]__1bmdu4k._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1bmdu4k._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_0qptkf4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0qptkf4._.js");
      case "server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js");
      case "server/chunks/ssr/node_modules_02ipk9q._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_02ipk9q._.js");
      case "server/chunks/ssr/node_modules_1wax83z._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_1wax83z._.js");
      case "server/chunks/ssr/node_modules_next_17sz44y._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_17sz44y._.js");
      case "server/chunks/ssr/node_modules_next_dist_03d_eun._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_03d_eun._.js");
      case "server/chunks/ssr/node_modules_next_dist_0jq_uwy._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_0jq_uwy._.js");
      case "server/chunks/ssr/node_modules_next_dist_0nkkbfv._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_0nkkbfv._.js");
      case "server/chunks/ssr/node_modules_next_dist_18_d8l1._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_18_d8l1._.js");
      case "server/chunks/ssr/node_modules_next_dist_1v8aef8._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1v8aef8._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_0p8s4lh._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_0p8s4lh._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0x.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0x.js");
      case "server/chunks/ssr/node_modules_next_dist_compiled_@opentelemetry_api_index_1oy1nwh.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_compiled_@opentelemetry_api_index_1oy1nwh.js");
      case "server/chunks/ssr/src_16_m9xe._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_16_m9xe._.js");
      case "server/chunks/ssr/src_app_error_tsx_0ac07bj._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_error_tsx_0ac07bj._.js");
      case "server/chunks/ssr/src_app_error_tsx_1gs2ol2._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_error_tsx_1gs2ol2._.js");
      case "server/chunks/[externals]__1coekr0._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[externals]__1coekr0._.js");
      case "server/chunks/[root-of-the-server]__00_hq9v._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__00_hq9v._.js");
      case "server/chunks/[root-of-the-server]__05esl-6._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__05esl-6._.js");
      case "server/chunks/_14oyaqf._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_14oyaqf._.js");
      case "server/chunks/_1dk16sf._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1dk16sf._.js");
      case "server/chunks/_1s2bw3r._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1s2bw3r._.js");
      case "server/chunks/_next-internal_server_app_api_admin_export_bookings_route_actions_1xa0svz.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_export_bookings_route_actions_1xa0svz.js");
      case "server/chunks/node_modules_1xz37fv._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/node_modules_1xz37fv._.js");
      case "server/chunks/src_lib_17k6yhu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_17k6yhu._.js");
      case "server/chunks/src_lib_db_0gv3dg6._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_db_0gv3dg6._.js");
      case "server/chunks/src_lib_db_availability_ts_00cx7hi._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_db_availability_ts_00cx7hi._.js");
      case "server/chunks/src_lib_db_promos_ts_1abvzrd._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_db_promos_ts_1abvzrd._.js");
      case "server/chunks/src_lib_notify_email_ts_06epv_p._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_notify_email_ts_06epv_p._.js");
      case "server/chunks/_16c_ump._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_16c_ump._.js");
      case "server/chunks/_next-internal_server_app_api_admin_upload_route_actions_0gtguvx.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_upload_route_actions_0gtguvx.js");
      case "server/chunks/node_modules_next_1zdbrne._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/node_modules_next_1zdbrne._.js");
      case "server/chunks/[root-of-the-server]__04bl5eg._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__04bl5eg._.js");
      case "server/chunks/_next-internal_server_app_api_auth_clear_route_actions_1rgsltv.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_auth_clear_route_actions_1rgsltv.js");
      case "server/chunks/[root-of-the-server]__0gfrl17._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0gfrl17._.js");
      case "server/chunks/_0dlb69n._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0dlb69n._.js");
      case "server/chunks/_1yk0td5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1yk0td5._.js");
      case "server/chunks/_next-internal_server_app_api_auth_google_callback_route_actions_0x6kl3t.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_auth_google_callback_route_actions_0x6kl3t.js");
      case "server/chunks/src_lib_1axoc7f._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_1axoc7f._.js");
      case "server/chunks/[root-of-the-server]__0l7wpx2._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0l7wpx2._.js");
      case "server/chunks/_next-internal_server_app_api_auth_google_route_actions_0rae5gv.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_auth_google_route_actions_0rae5gv.js");
      case "server/chunks/_0audcjy._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0audcjy._.js");
      case "server/chunks/_next-internal_server_app_api_bookings_mine_route_actions_1td4a3f.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_bookings_mine_route_actions_1td4a3f.js");
      case "server/chunks/[root-of-the-server]__0tbqq09._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0tbqq09._.js");
      case "server/chunks/_next-internal_server_app_api_media_[___key]_route_actions_1cts520.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_media_[___key]_route_actions_1cts520.js");
      case "server/chunks/_02-20hg._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_02-20hg._.js");
      case "server/chunks/_0wzzc3x._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0wzzc3x._.js");
      case "server/chunks/_next-internal_server_app_api_notifications_read_route_actions_0e5djxq.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notifications_read_route_actions_0e5djxq.js");
      case "server/chunks/src_lib_1yeakdy._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_1yeakdy._.js");
      case "server/chunks/_04gqbk2._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_04gqbk2._.js");
      case "server/chunks/_1x1b68r._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1x1b68r._.js");
      case "server/chunks/_next-internal_server_app_api_notifications_route_actions_1272ib8.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_notifications_route_actions_1272ib8.js");
      case "server/chunks/src_lib_1fsgd_o._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_1fsgd_o._.js");
      case "server/chunks/_0l7webn._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0l7webn._.js");
      case "server/chunks/_1ia-t6l._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1ia-t6l._.js");
      case "server/chunks/_next-internal_server_app_api_push_prompt_route_actions_20y31cs.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_push_prompt_route_actions_20y31cs.js");
      case "server/chunks/[root-of-the-server]__0veo5vd._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0veo5vd._.js");
      case "server/chunks/_1b0tezi._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1b0tezi._.js");
      case "server/chunks/_next-internal_server_app_api_push_public-key_route_actions_05ik4c8.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_push_public-key_route_actions_05ik4c8.js");
      case "server/chunks/_0dp0c3k._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0dp0c3k._.js");
      case "server/chunks/_0u-kwtt._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0u-kwtt._.js");
      case "server/chunks/_next-internal_server_app_api_push_subscribe_route_actions_209jg7g.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_push_subscribe_route_actions_209jg7g.js");
      case "server/chunks/[externals]__13i6u3d._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[externals]__13i6u3d._.js");
      case "server/chunks/[root-of-the-server]__1rnpjut._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1rnpjut._.js");
      case "server/chunks/_12kdc3y._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_12kdc3y._.js");
      case "server/chunks/_next-internal_server_app_api_stripe_checkout_route_actions_162o1yo.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_stripe_checkout_route_actions_162o1yo.js");
      case "server/chunks/src_lib_1e6ftf6._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_1e6ftf6._.js");
      case "server/chunks/src_lib_db_0x6vdk4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_db_0x6vdk4._.js");
      case "server/chunks/src_lib_payments_stripe_ts_0u2mt40._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_payments_stripe_ts_0u2mt40._.js");
      case "server/chunks/[root-of-the-server]__0vg6-qp._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0vg6-qp._.js");
      case "server/chunks/_1akjnym._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1akjnym._.js");
      case "server/chunks/_next-internal_server_app_api_stripe_webhook_route_actions_0mqdm30.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_stripe_webhook_route_actions_0mqdm30.js");
      case "server/chunks/src_lib_0b49m9t._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_0b49m9t._.js");
      case "server/chunks/src_lib_db_loyalty_ts_0nesy09._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/src_lib_db_loyalty_ts_0nesy09._.js");
      case "server/chunks/_0llue4s._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0llue4s._.js");
      case "server/chunks/_1xyjnvz._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1xyjnvz._.js");
      case "server/chunks/_next-internal_server_app_api_webauthn_credentials_route_actions_12l98t4.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_webauthn_credentials_route_actions_12l98t4.js");
      case "server/chunks/[root-of-the-server]__1jt_icw._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1jt_icw._.js");
      case "server/chunks/_0x_c45a._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0x_c45a._.js");
      case "server/chunks/_next-internal_server_app_api_webauthn_login_options_route_actions_1vei-li.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_webauthn_login_options_route_actions_1vei-li.js");
      case "server/chunks/node_modules_@simplewebauthn_server_esm_index_0qn_b5k.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/node_modules_@simplewebauthn_server_esm_index_0qn_b5k.js");
      case "server/chunks/[root-of-the-server]__1co142u._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1co142u._.js");
      case "server/chunks/_05crtm8._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_05crtm8._.js");
      case "server/chunks/_next-internal_server_app_api_webauthn_login_verify_route_actions_1g0s02s.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_webauthn_login_verify_route_actions_1g0s02s.js");
      case "server/chunks/_1sl4wmh._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_1sl4wmh._.js");
      case "server/chunks/_next-internal_server_app_api_webauthn_register_options_route_actions_1mwwoq5.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_webauthn_register_options_route_actions_1mwwoq5.js");
      case "server/chunks/_01_7571._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_01_7571._.js");
      case "server/chunks/_next-internal_server_app_api_webauthn_register_verify_route_actions_1c2el-e.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_webauthn_register_verify_route_actions_1c2el-e.js");
      case "server/chunks/[root-of-the-server]__0x1lb_l._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0x1lb_l._.js");
      case "server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjls.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjls.js");
      case "server/chunks/[root-of-the-server]__14glucw._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__14glucw._.js");
      case "server/chunks/_next-internal_server_app_manifest_webmanifest_route_actions_08hcpz0.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_manifest_webmanifest_route_actions_08hcpz0.js");
      case "server/chunks/ssr/[root-of-the-server]__1_psvs2._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1_psvs2._.js");
      case "server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0q-w892.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0q-w892.js");
      case "server/chunks/[root-of-the-server]__0wd986k._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0wd986k._.js");
      case "server/chunks/_next-internal_server_app_robots_txt_route_actions_15vc_89.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_robots_txt_route_actions_15vc_89.js");
      case "server/chunks/[root-of-the-server]__098tqp4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__098tqp4._.js");
      case "server/chunks/_0muyrbf._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_0muyrbf._.js");
      case "server/chunks/_next-internal_server_app_sitemap_xml_route_actions_05l5km9.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_sitemap_xml_route_actions_05l5km9.js");
      case "server/chunks/ssr/[externals]__1fjx4gr._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[externals]__1fjx4gr._.js");
      case "server/chunks/ssr/[root-of-the-server]__07soo5b._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__07soo5b._.js");
      case "server/chunks/ssr/[root-of-the-server]__0l9bgel._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0l9bgel._.js");
      case "server/chunks/ssr/_0-wyp27._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0-wyp27._.js");
      case "server/chunks/ssr/_0-zo30b._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0-zo30b._.js");
      case "server/chunks/ssr/_001395a._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_001395a._.js");
      case "server/chunks/ssr/_01uzytw._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_01uzytw._.js");
      case "server/chunks/ssr/_023-ynd._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_023-ynd._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_about_page_actions_0lkfw3o.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_about_page_actions_0lkfw3o.js");
      case "server/chunks/ssr/node_modules_0pqllj3._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_0pqllj3._.js");
      case "server/chunks/ssr/node_modules_next_0x3i8za._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_0x3i8za._.js");
      case "server/chunks/ssr/node_modules_next_dist_1knwlsz._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1knwlsz._.js");
      case "server/chunks/ssr/src_app_[lang]_error_tsx_0bftfvf._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_[lang]_error_tsx_0bftfvf._.js");
      case "server/chunks/ssr/src_app_[lang]_error_tsx_18_q4vh._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_[lang]_error_tsx_18_q4vh._.js");
      case "server/chunks/ssr/src_app_[lang]_not-found_tsx_1309l6m._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_[lang]_not-found_tsx_1309l6m._.js");
      case "server/chunks/ssr/src_lib_auth_session_ts_0avz3b3._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_auth_session_ts_0avz3b3._.js");
      case "server/chunks/ssr/src_lib_i18n_dictionaries_en_ts_1j4u4iw._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_i18n_dictionaries_en_ts_1j4u4iw._.js");
      case "server/chunks/ssr/src_lib_i18n_dictionaries_es_ts_0hnp0f5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_i18n_dictionaries_es_ts_0hnp0f5._.js");
      case "server/chunks/ssr/[root-of-the-server]__149e3jj._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__149e3jj._.js");
      case "server/chunks/ssr/_172i5xx._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_172i5xx._.js");
      case "server/chunks/ssr/_1c6t4hs._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1c6t4hs._.js");
      case "server/chunks/ssr/_1mru1_f._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1mru1_f._.js");
      case "server/chunks/ssr/node_modules_zod_v4_classic_schemas_08m1g1a.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_zod_v4_classic_schemas_08m1g1a.js");
      case "server/chunks/ssr/src_08ejw3b._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_08ejw3b._.js");
      case "server/chunks/ssr/src_0x0e9iv._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_0x0e9iv._.js");
      case "server/chunks/ssr/src_lib_1clz5bq._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_1clz5bq._.js");
      case "server/chunks/ssr/src_lib_admin_activity_ts_0h6r7hu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_admin_activity_ts_0h6r7hu._.js");
      case "server/chunks/ssr/src_lib_db_availability_ts_10205a0._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_db_availability_ts_10205a0._.js");
      case "server/chunks/ssr/src_lib_db_promos_ts_1zbx2kr._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_db_promos_ts_1zbx2kr._.js");
      case "server/chunks/ssr/src_lib_notify_email_ts_0b15g5l._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_notify_email_ts_0b15g5l._.js");
      case "server/chunks/ssr/[root-of-the-server]__1g5_m1h._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1g5_m1h._.js");
      case "server/chunks/ssr/_1mqq8w4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1mqq8w4._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_admin_activity_page_actions_0zgbl6f.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_admin_activity_page_actions_0zgbl6f.js");
      case "server/chunks/ssr/node_modules_next_dist_api_navigation_react-server_09-6jf3.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_api_navigation_react-server_09-6jf3.js");
      case "server/chunks/ssr/src_lib_10mn50i._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_10mn50i._.js");
      case "server/chunks/ssr/[root-of-the-server]__0vlc7lm._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0vlc7lm._.js");
      case "server/chunks/ssr/_0t4ncu2._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0t4ncu2._.js");
      case "server/chunks/ssr/_1d5sxb5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1d5sxb5._.js");
      case "server/chunks/ssr/node_modules_next_0n5dn-n._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_0n5dn-n._.js");
      case "server/chunks/ssr/[root-of-the-server]__0hgusvl._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0hgusvl._.js");
      case "server/chunks/ssr/_098uf1-._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_098uf1-._.js");
      case "server/chunks/ssr/src_components_admin_DeleteButton_tsx_0pn53kp._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_admin_DeleteButton_tsx_0pn53kp._.js");
      case "server/chunks/ssr/[root-of-the-server]__17dbq8h._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__17dbq8h._.js");
      case "server/chunks/ssr/_0sy7s9i._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0sy7s9i._.js");
      case "server/chunks/ssr/[root-of-the-server]__1tusigu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1tusigu._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_admin_bookings_page_actions_1sbp77t.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_admin_bookings_page_actions_1sbp77t.js");
      case "server/chunks/ssr/src_1fw7sh0._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_1fw7sh0._.js");
      case "server/chunks/ssr/src_components_ui_DatePicker_tsx_0--z71s._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_DatePicker_tsx_0--z71s._.js");
      case "server/chunks/ssr/[root-of-the-server]__0h22un7._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0h22un7._.js");
      case "server/chunks/ssr/_0e8m77a._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0e8m77a._.js");
      case "server/chunks/ssr/_1v3e7qx._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1v3e7qx._.js");
      case "server/chunks/ssr/src_lib_notify_1bhfgar._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_notify_1bhfgar._.js");
      case "server/chunks/ssr/[root-of-the-server]__1lkeka-._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1lkeka-._.js");
      case "server/chunks/ssr/_0v47jds._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0v47jds._.js");
      case "server/chunks/ssr/_1l02164._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1l02164._.js");
      case "server/chunks/ssr/node_modules_next_0yhfk_h._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_0yhfk_h._.js");
      case "server/chunks/ssr/node_modules_next_dist_1o0c2jg._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1o0c2jg._.js");
      case "server/chunks/ssr/[root-of-the-server]__0-3hiw5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0-3hiw5._.js");
      case "server/chunks/ssr/_0ivupnm._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0ivupnm._.js");
      case "server/chunks/ssr/_18jy2iw._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_18jy2iw._.js");
      case "server/chunks/ssr/[root-of-the-server]__0rjv5pq._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0rjv5pq._.js");
      case "server/chunks/ssr/_1_xv9ew._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1_xv9ew._.js");
      case "server/chunks/ssr/[root-of-the-server]__0veruji._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0veruji._.js");
      case "server/chunks/ssr/_0ti0hon._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0ti0hon._.js");
      case "server/chunks/ssr/[root-of-the-server]__1rkobvg._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1rkobvg._.js");
      case "server/chunks/ssr/_0oqocu3._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0oqocu3._.js");
      case "server/chunks/ssr/_0t59nof._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0t59nof._.js");
      case "server/chunks/ssr/[root-of-the-server]__0eqr1h8._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0eqr1h8._.js");
      case "server/chunks/ssr/_0awp35m._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0awp35m._.js");
      case "server/chunks/ssr/[root-of-the-server]__0ufnor1._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ufnor1._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_admin_occupancy_page_actions_18tlh--.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_admin_occupancy_page_actions_18tlh--.js");
      case "server/chunks/ssr/[root-of-the-server]__1-ig89m._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1-ig89m._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_admin_page_actions_0cutr25.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_admin_page_actions_0cutr25.js");
      case "server/chunks/ssr/[root-of-the-server]__0m1l1p6._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0m1l1p6._.js");
      case "server/chunks/ssr/_1gqu3p6._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1gqu3p6._.js");
      case "server/chunks/ssr/_1t1x_bp._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1t1x_bp._.js");
      case "server/chunks/ssr/[root-of-the-server]__009w_il._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__009w_il._.js");
      case "server/chunks/ssr/_1h33_il._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1h33_il._.js");
      case "server/chunks/ssr/[root-of-the-server]__1luunjz._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1luunjz._.js");
      case "server/chunks/ssr/_02h7366._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_02h7366._.js");
      case "server/chunks/ssr/[root-of-the-server]__0mk7d9l._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0mk7d9l._.js");
      case "server/chunks/ssr/_16j0kvk._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_16j0kvk._.js");
      case "server/chunks/ssr/[root-of-the-server]__11ffsyk._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__11ffsyk._.js");
      case "server/chunks/ssr/_0pji7z3._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0pji7z3._.js");
      case "server/chunks/ssr/_17cpklm._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_17cpklm._.js");
      case "server/chunks/ssr/[root-of-the-server]__0z4j2l5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0z4j2l5._.js");
      case "server/chunks/ssr/_05eh856._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_05eh856._.js");
      case "server/chunks/ssr/[root-of-the-server]__0qey3_e._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0qey3_e._.js");
      case "server/chunks/ssr/_160rk2_._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_160rk2_._.js");
      case "server/chunks/ssr/[root-of-the-server]__0cuu3ar._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0cuu3ar._.js");
      case "server/chunks/ssr/_0xa0_yy._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0xa0_yy._.js");
      case "server/chunks/ssr/_1db_dzu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1db_dzu._.js");
      case "server/chunks/ssr/[root-of-the-server]__114fqio._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__114fqio._.js");
      case "server/chunks/ssr/_03k11f4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_03k11f4._.js");
      case "server/chunks/ssr/_0lqf76v._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0lqf76v._.js");
      case "server/chunks/ssr/[root-of-the-server]__052_nml._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__052_nml._.js");
      case "server/chunks/ssr/_0ygh281._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0ygh281._.js");
      case "server/chunks/ssr/[root-of-the-server]__0elz9r-._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0elz9r-._.js");
      case "server/chunks/ssr/_03u5g-5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_03u5g-5._.js");
      case "server/chunks/ssr/[root-of-the-server]__1pcvvta._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1pcvvta._.js");
      case "server/chunks/ssr/_1_4e5q4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1_4e5q4._.js");
      case "server/chunks/ssr/_1a2ia83._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1a2ia83._.js");
      case "server/chunks/ssr/[root-of-the-server]__1b2b_0i._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1b2b_0i._.js");
      case "server/chunks/ssr/_1-q25gz._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1-q25gz._.js");
      case "server/chunks/ssr/[root-of-the-server]__1b80wu5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1b80wu5._.js");
      case "server/chunks/ssr/_1iincr9._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1iincr9._.js");
      case "server/chunks/ssr/[root-of-the-server]__0aa7e85._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0aa7e85._.js");
      case "server/chunks/ssr/_15em4qz._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_15em4qz._.js");
      case "server/chunks/ssr/_1pkcwbe._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1pkcwbe._.js");
      case "server/chunks/ssr/[root-of-the-server]__1xnocu4._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1xnocu4._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_blog_page_actions_0sb1hob.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_blog_page_actions_0sb1hob.js");
      case "server/chunks/ssr/[root-of-the-server]__1nsgucx._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1nsgucx._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_blog_[slug]_page_actions_0p_u_t6.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_blog_[slug]_page_actions_0p_u_t6.js");
      case "server/chunks/ssr/[externals]__0ic-fg3._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[externals]__0ic-fg3._.js");
      case "server/chunks/ssr/[root-of-the-server]__0koffwe._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0koffwe._.js");
      case "server/chunks/ssr/_0m_glw8._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0m_glw8._.js");
      case "server/chunks/ssr/_1k2rcrm._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1k2rcrm._.js");
      case "server/chunks/ssr/src_components_booking_BookingForm_tsx_05yquet._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_booking_BookingForm_tsx_05yquet._.js");
      case "server/chunks/ssr/src_lib_01q0ygu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_01q0ygu._.js");
      case "server/chunks/ssr/src_lib_payments_stripe_ts_1rtb_5k._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_payments_stripe_ts_1rtb_5k._.js");
      case "server/chunks/ssr/[root-of-the-server]__0-9utv8._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0-9utv8._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_book_success_page_actions_0emtey4.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_book_success_page_actions_0emtey4.js");
      case "server/chunks/ssr/src_lib_060x8va._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_060x8va._.js");
      case "server/chunks/ssr/[root-of-the-server]__05sq73_._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__05sq73_._.js");
      case "server/chunks/ssr/_00pfwje._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_00pfwje._.js");
      case "server/chunks/ssr/_1tbe6h3._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1tbe6h3._.js");
      case "server/chunks/ssr/[root-of-the-server]__14q9b0d._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__14q9b0d._.js");
      case "server/chunks/ssr/_0_m_w18._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_0_m_w18._.js");
      case "server/chunks/ssr/_1u1bwtu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1u1bwtu._.js");
      case "server/chunks/ssr/src_lib_19_jv6j._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_19_jv6j._.js");
      case "server/chunks/ssr/[root-of-the-server]__1n11xd5._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1n11xd5._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_page_actions_0w9tv30.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_page_actions_0w9tv30.js");
      case "server/chunks/ssr/src_04cqwni._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_04cqwni._.js");
      case "server/chunks/ssr/[root-of-the-server]__0mf2tl1._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0mf2tl1._.js");
      case "server/chunks/ssr/_1hj3xqw._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1hj3xqw._.js");
      case "server/chunks/ssr/_1m7q-yy._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_1m7q-yy._.js");
      case "server/chunks/ssr/src_lib_1duxpiu._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_1duxpiu._.js");
      case "server/chunks/ssr/[root-of-the-server]__1wqnie6._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1wqnie6._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_tours_page_actions_0sn0_ez.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_tours_page_actions_0sn0_ez.js");
      case "server/chunks/ssr/[root-of-the-server]__00bi0ri._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__00bi0ri._.js");
      case "server/chunks/ssr/_18ejjiq._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_18ejjiq._.js");
      case "server/chunks/ssr/src_141ec04._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_141ec04._.js");
      case "server/chunks/ssr/src_components_1u1eui_._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_1u1eui_._.js");
      case "server/chunks/ssr/src_lib_1or6vlq._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_1or6vlq._.js");
      case "server/chunks/ssr/[root-of-the-server]__016jomp._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__016jomp._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_track_page_actions_1skggcq.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_track_page_actions_1skggcq.js");
      case "server/chunks/ssr/src_components_ui_SubmitButton_tsx_19zjqz8._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_ui_SubmitButton_tsx_19zjqz8._.js");
      case "server/chunks/ssr/src_lib_0g3buqn._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_0g3buqn._.js");
      case "server/chunks/ssr/[root-of-the-server]__1rdtmsk._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1rdtmsk._.js");
      case "server/chunks/ssr/_next-internal_server_app_[lang]_transfers_page_actions_1a2z7kg.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_[lang]_transfers_page_actions_1a2z7kg.js");
      case "server/chunks/ssr/[root-of-the-server]__0_g-ckz._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0_g-ckz._.js");
      case "server/chunks/ssr/[root-of-the-server]__1f2jx51._.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1f2jx51._.js");
      case "server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-.js": return require("C:/Users/VIP/Documents/prz/prz-web/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }


  async function loadWasmChunk(chunkPath) {
    switch (chunkPath) {

      default:
        throw new Error(`Unknown wasm chunk: ${chunkPath}`);
    }
  }

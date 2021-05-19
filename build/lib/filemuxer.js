"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShardSuccesfulIntegrityCheck = exports.ShardFailedIntegrityCheckError = exports.FileMuxerError = void 0;
var crypto_1 = require("crypto");
var stream_1 = require("stream");
var assert_1 = __importDefault(require("assert"));
var crypto_2 = require("./crypto");
var FileMuxerError = /** @class */ (function (_super) {
    __extends(FileMuxerError, _super);
    function FileMuxerError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return FileMuxerError;
}(Error));
exports.FileMuxerError = FileMuxerError;
var ShardFailedIntegrityCheckError = /** @class */ (function (_super) {
    __extends(ShardFailedIntegrityCheckError, _super);
    function ShardFailedIntegrityCheckError(content) {
        var _this = _super.call(this) || this;
        _this.name = 'ShardFailedIntegrityCheck';
        _this.message = 'Shard failed integrity check';
        _this.content = content;
        return _this;
    }
    return ShardFailedIntegrityCheckError;
}(FileMuxerError));
exports.ShardFailedIntegrityCheckError = ShardFailedIntegrityCheckError;
var ShardSuccesfulIntegrityCheck = /** @class */ (function () {
    function ShardSuccesfulIntegrityCheck(content) {
        this.content = content;
    }
    return ShardSuccesfulIntegrityCheck;
}());
exports.ShardSuccesfulIntegrityCheck = ShardSuccesfulIntegrityCheck;
/**
 * Accepts multiple ordered input sources and exposes them as a single
 * contiguous readable stream. Used for re-assembly of shards.
 */
var FileMuxer = /** @class */ (function (_super) {
    __extends(FileMuxer, _super);
    function FileMuxer(options) {
        var _this = _super.call(this) || this;
        _this.inputs = [];
        _this.bytesRead = 0;
        _this.added = 0;
        _this.sourceDrainTimeout = null;
        _this.checkOptions(options);
        _this.hasher = crypto_1.createHash('sha256');
        _this.shards = options.shards;
        _this.length = options.length;
        // this.setMaxListeners(3000);
        _this.options = __assign(__assign({}, FileMuxer.DEFAULTS), options);
        return _this;
    }
    FileMuxer.prototype.checkOptions = function (options) {
        assert_1.default(typeof options.shards === 'number', 'You must supply a shards parameter');
        assert_1.default(options.shards > 0, 'Cannot multiplex a 0 shard stream');
        assert_1.default(typeof options.length === 'number', 'You must supply a length parameter');
        assert_1.default(options.length > 0, 'Cannot multiplex a 0 length stream');
    };
    FileMuxer.prototype.waitForSourceAvailable = function () {
        var _this = this;
        this.once('sourceAdded', this._read.bind(this));
        this.sourceDrainTimeout = setTimeout(function () {
            _this.removeAllListeners('sourceAdded');
            // this.emit('error', new Error('Unexpected end of source stream'))
        }, this.options.sourceDrainWait ? this.options.sourceDrainWait : 8000);
    };
    FileMuxer.prototype.mux = function (bytes) {
        this.bytesRead += bytes.length;
        if (this.length < this.bytesRead) {
            return this.emit('error', new Error('Input exceeds expected length'));
        }
        this.hasher.update(bytes);
        return this.push(bytes);
    };
    /**
     * Implements the underlying read method
     * @private
     */
    FileMuxer.prototype._read = function (size) {
        var _this = this;
        if (this.sourceDrainTimeout) {
            clearTimeout(this.sourceDrainTimeout);
        }
        if (this.bytesRead === this.length) {
            return this.push(null);
        }
        if (!this.inputs[0]) {
            this.waitForSourceAvailable();
            return true;
        }
        var readFromSource = function (size) {
            var bytes = _this.inputs[0] ? _this.inputs[0].read(size) : null;
            if (bytes !== null) {
                return _this.mux(bytes);
            }
            setTimeout(readFromSource.bind(_this), _this.options.sourceIdleWait);
        };
        readFromSource(size);
        return true;
    };
    /**
     * Adds an additional input stream to the multiplexer
     * @param readable - Readable input stream from file shard
     * @param hash - Hash of the shard
     * @param echangeReport - Instance of exchange report
     */
    FileMuxer.prototype.addInputSource = function (readable, shardSize, hash, echangeReport) {
        var _this = this;
        assert_1.default(typeof readable.pipe === 'function', 'Invalid input stream supplied');
        assert_1.default(this.added < this.shards, 'Inputs exceed defined number of shards');
        var input = new stream_1.PassThrough();
        readable.on('data', function (data) {
            input.pause();
            input.push(data);
        });
        readable.on('end', function () { input.end(); });
        input.once('readable', function () {
            // console.log('shard is now readable, start to download')
            // Init exchange report
        });
        // input.on('data', () => {});
        input.once('end', function () {
            console.log('passthorugh end here');
            // const digest = this.hasher.digest();
            // const inputHash = ripemd160(digest);
            // const expectedHash = inputHash.toString('hex');
            // this.hasher = createHash('sha256');
            var inputHash = crypto_2.ripemd160(_this.hasher.digest());
            _this.hasher = crypto_1.createHash('sha256');
            _this.inputs.splice(_this.inputs.indexOf(input), 1);
            if (Buffer.compare(inputHash, hash) !== 0) {
                // Send exchange report FAILED_INTEGRITY
                // const actualHash = hash.toString('hex');
                console.log('Expected hash: %s, actual: %s', hash.toString('hex'), inputHash.toString('hex'));
                _this.emit('error', Error('Shard failed integrity check'));
                // this.emit('error', new ShardFailedIntegrityCheckError({ expectedHash: '', actualHash }));
            }
            else {
                console.log('Shard %s OK', inputHash.toString('hex'));
                // this.emit(FILEMUXER.PROGRESS, new ShardSuccesfulIntegrityCheck({ expectedHash: '', digest: '' }));
            }
            console.log('Emiiting drain');
            _this.emit('drain', input);
        });
        readable.on('error', function (err) {
            // Send failure exchange report DOWNLOAD_EERROR
            _this.emit('error', err);
        });
        this.added++;
        this.inputs.push(input);
        this.emit('sourceAdded');
        return this;
    };
    FileMuxer.DEFAULTS = {
        sourceDrainWait: 8000,
        sourceIdleWait: 4000
    };
    return FileMuxer;
}(stream_1.Readable));
exports.default = FileMuxer;

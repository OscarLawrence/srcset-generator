"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const cl = require('cloudinary').v2;
const download = require('image-downloader');
class ImageGenerator {
    constructor(imagesPath, imageDataPath, cloudinaryAuth, options = {
        create_derived: true,
        bytes_step: 20000,
        min_width: 200,
        max_width: 2000,
        transformation: { crop: 'fill', gravity: 'auto' },
    }) {
        this.images = [];
        this.dirs = [];
        this.options = {
            create_derived: true,
            bytes_step: 20000,
            min_width: 200,
            max_width: 2000,
            transformation: { crop: 'fill', gravity: 'auto' },
        };
        this.imagesPath = imagesPath;
        this.imageDataPath = imageDataPath;
        this.clAuth = cloudinaryAuth;
        this.options = options;
        cl.config(this.clAuth);
        this.init();
        this.setup();
    }
    init() {
        fs_1.default.readdirSync(this.imagesPath).forEach((file) => {
            // TODO: more specific testing for directory
            if (file.includes('.')) {
                this.images.push(file);
            }
            else {
                this.dirs.push(file);
            }
        });
    }
    setup() {
        this.images.forEach((image) => {
            const { fileName, extension } = this.getFileNameAndExtension(image);
            // check if images have already been generated
            if (this.dirs.includes(fileName)) {
                return;
            }
            const dirName = this.imagesPath + `/${fileName}`;
            // creating imageDirectory
            fs_1.default.mkdirSync(dirName);
            fs_1.default.mkdirSync(dirName + '/' + extension);
            fs_1.default.mkdirSync(dirName + '/webp');
            console.info(`created directory: ${dirName} plus subdirectories`);
            this.generate(fileName, extension, dirName);
        });
    }
    generate(fileName, extension, dirName) {
        console.info(`uploading ${fileName}.${extension} ...`);
        cl.uploader.upload(`${this.imagesPath}/${fileName}.${extension}`, { responsive_breakpoints: this.options }, (err, res) => __awaiter(this, void 0, void 0, function* () {
            if (err)
                throw Error(`error uploading ${fileName}`);
            else {
                console.log(res);
                const imagePaths = yield this.downloadFiles(res, fileName, extension, dirName);
                fs_1.default.writeFile(`${this.imageDataPath}/${fileName}.json`, JSON.stringify(imagePaths), (err) => {
                    if (err)
                        console.error(err);
                    else {
                        console.info(`wrote json file for ${fileName}`);
                    }
                });
            }
        }));
    }
    downloadFiles(res, fileName, extension, dirName) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            let imagePaths = { [extension]: {}, webp: {} };
            console.info(`downloading files for ${fileName}.${extension} ...`);
            try {
                for (var _b = __asyncValues(res.responsive_breakpoints[0].breakpoints), _c; _c = yield _b.next(), !_c.done;) {
                    let file = _c.value;
                    const url = file.secure_url;
                    const webpUrl = this.createWebpUrl(url);
                    const fileWidth = file.width;
                    const fileHeight = file.height;
                    yield download
                        .image({
                        url: url,
                        dest: `${dirName}/${extension}/${fileWidth}x${fileHeight}.${extension}`,
                    })
                        .then(({ filename }) => {
                        console.info(`downloaded file for ${fileWidth}px width`);
                        imagePaths[extension][fileWidth] = filename;
                    });
                    yield download
                        .image({
                        url: webpUrl,
                        dest: `${dirName}/webp/${fileWidth}x${fileHeight}.webp`,
                    })
                        .then(({ filename }) => {
                        console.info(`downloaded webp file for ${fileWidth}px width`);
                        imagePaths.webp[fileWidth] = filename;
                    });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return imagePaths;
        });
    }
    getFileNameAndExtension(file) {
        let rawFile = file.split('.');
        //@ts-ignore
        const extension = rawFile.pop();
        const fileName = rawFile.join('.');
        return {
            fileName: fileName,
            extension: extension,
        };
    }
    createWebpUrl(url) {
        const split = url.split('.');
        split.pop();
        split.push('webp');
        return split.join('.');
    }
}
exports.default = ImageGenerator;

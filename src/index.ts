import fs from 'fs';
const cl = require('cloudinary').v2;

const download = require('image-downloader');

interface CloudinaryAuthI {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

interface TransformI {
  crop?: string;
  gravity?: string;
  aspect_ratio?: string;
}

interface OptionsI {
  create_derived?: boolean;
  bytes_step?: number;
  min_width?: number;
  max_width?: number;
  transformation?: TransformI;
}

export default class ImageGenerator {
  private imagesPath: string;
  private imageDataPath: string;
  private clAuth: CloudinaryAuthI;
  private images: string[] = [];
  private dirs: string[] = [];
  public options: OptionsI = {
    create_derived: true,
    bytes_step: 20000,
    min_width: 200,
    max_width: 2000,
    transformation: { crop: 'fill', gravity: 'auto' },
  };

  constructor(
    imagesPath: string,
    imageDataPath: string,
    cloudinaryAuth: CloudinaryAuthI,
    options: OptionsI = {
      create_derived: true,
      bytes_step: 20000,
      min_width: 200,
      max_width: 2000,
      transformation: { crop: 'fill', gravity: 'auto' },
    }
  ) {
    this.imagesPath = imagesPath;
    this.imageDataPath = imageDataPath;
    this.clAuth = cloudinaryAuth;
    this.options = options;
    cl.config(this.clAuth);
    this.init();
    this.setup();
  }

  init() {
    fs.readdirSync(this.imagesPath).forEach((file: string) => {
      // TODO: more specific testing for directory
      if (file.includes('.')) {
        this.images.push(file);
      } else {
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
      fs.mkdirSync(dirName);
      fs.mkdirSync(dirName + '/' + extension);
      fs.mkdirSync(dirName + '/webp');
      console.info(`created directory: ${dirName} plus subdirectories`);
      this.generate(fileName, extension, dirName);
    });
  }

  generate(fileName: string, extension: string, dirName: string) {
    console.info(`uploading ${fileName}.${extension} ...`);
    cl.uploader.upload(
      `${this.imagesPath}/${fileName}.${extension}`,
      { responsive_breakpoints: this.options },
      async (err: any, res: any) => {
        if (err) throw Error(`error uploading ${fileName}`);
        else {
          console.log(res);
          const imagePaths = await this.downloadFiles(res, fileName, extension, dirName);
          fs.writeFile(
            `${this.imageDataPath}/${fileName}.json`,
            JSON.stringify(imagePaths),
            (err: any) => {
              if (err) console.error(err);
              else {
                console.info(`wrote json file for ${fileName}`);
              }
            }
          );
        }
      }
    );
  }

  async downloadFiles(res: any, fileName: string, extension: string, dirName: string) {
    let imagePaths = { [extension]: {}, webp: {} };
    console.info(`downloading files for ${fileName}.${extension} ...`);
    for await (let file of res.responsive_breakpoints[0].breakpoints) {
      const url = file.secure_url;
      const webpUrl = this.createWebpUrl(url);
      const fileWidth: string = file.width;
      const fileHeight: string = file.height;

      await download
        .image({
          url: url,
          dest: `${dirName}/${extension}/${fileWidth}x${fileHeight}.${extension}`,
        })
        .then(({ filename }: { filename: string }) => {
          console.info(`downloaded file for ${fileWidth}px width`);

          imagePaths[extension][fileWidth] = filename;
        });
      await download
        .image({
          url: webpUrl,
          dest: `${dirName}/webp/${fileWidth}x${fileHeight}.webp`,
        })
        .then(({ filename }: { filename: string }) => {
          console.info(`downloaded webp file for ${fileWidth}px width`);

          imagePaths.webp[fileWidth] = filename;
        });
    }

    return imagePaths;
  }

  getFileNameAndExtension(file: string): { fileName: string; extension: string } {
    let rawFile = file.split('.');
    //@ts-ignore
    const extension: string = rawFile.pop();
    const fileName = rawFile.join('.');
    return {
      fileName: fileName,
      extension: extension,
    };
  }

  createWebpUrl(url: string) {
    const split = url.split('.');
    split.pop();
    split.push('webp');
    return split.join('.');
  }
}

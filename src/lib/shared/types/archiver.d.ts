declare module 'archiver' {
  import { Transform } from 'node:stream';

  type AppendData = { name: string };

  export class Archiver extends Transform {
    append(source: string | Buffer | NodeJS.ReadableStream, data: AppendData): this;
    finalize(): Promise<void>;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: { zlib?: { level?: number } });
  }

  export class TarArchive extends Archiver {
    constructor(options?: { gzip?: boolean; gzipOptions?: { level?: number } });
  }
}

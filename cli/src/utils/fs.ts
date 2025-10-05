import * as fs from 'fs-extra';
import { readFile, writeFile } from 'fs/promises';

export default {
    ...fs,
    readFile,
    writeFile
};

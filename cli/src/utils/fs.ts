import * as fs from 'fs-extra';
import * as fsp from 'fs/promises';
import {createWriteStream, createReadStream} from 'fs';

export default {
    ...fs,
    ...fsp,
    createWriteStream, createReadStream
};

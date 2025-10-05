import * as fs from 'fs-extra';
import * as fsp from 'fs/promises';

export default {
    ...fs,
    ...fsp
};

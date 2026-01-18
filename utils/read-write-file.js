import { readFile, writeFile } from 'node:fs/promises';

const DATABASE_FILE = './db.json';

export const readDB = async () => {
    try {
        const result = await readFile(DATABASE_FILE, 'utf-8');
        return JSON.parse(result);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeDB({});
        }
        return {};
    }
};

export const writeDB = async (data) => {
    await writeFile(DATABASE_FILE, JSON.stringify(data, null, 2));
};

const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

const files = [
    'ssd_mobilenetv1_model-weights_manifest.json',
    'ssd_mobilenetv1_model-shard1',
    'ssd_mobilenetv1_model-shard2',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

const downloadFile = (file) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(modelsDir, file);
        const fileStream = fs.createWriteStream(filePath);
        https.get(baseUrl + file, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${file}' (${response.statusCode})`));
                return;
            }
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err));
        });
    });
};

(async () => {
    console.log("Downloading models...");
    for (const file of files) {
        try {
            console.log(`Downloading ${file}...`);
            await downloadFile(file);
            console.log(`Successfully downloaded ${file}`);
        } catch (err) {
            console.error(err.message);
        }
    }
    console.log("All done!");
})();

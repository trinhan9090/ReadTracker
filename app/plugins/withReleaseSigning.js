const { withAppBuildGradle } = require('expo/config-plugins');

const marker = '// ReadSession release signing';
const signing = `
${marker}
def readSessionSigningFile = rootProject.file('../.private/signing.properties')
def readSessionSigning = new Properties()
if (readSessionSigningFile.exists()) {
    readSessionSigningFile.withInputStream { readSessionSigning.load(it) }
}
android {
    signingConfigs {
        release {
            storeFile rootProject.file('../.private/readsession-release.jks')
            storePassword readSessionSigning.getProperty('storePassword', '')
            keyAlias 'readsession'
            keyPassword readSessionSigning.getProperty('keyPassword', '')
        }
    }
    buildTypes.release.signingConfig = signingConfigs.release
}
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.project == project && it.name.toLowerCase().contains('release') }) {
        if (!readSessionSigningFile.exists() || !android.signingConfigs.release.storeFile.exists()) {
            throw new GradleException('ReadSession release credentials are missing. Configure the private local signing files before building a release.')
        }
    }
}
`;

function applySigning(contents) {
  if (contents.includes(marker)) return contents;
  return contents + '\n' + signing;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') throw new Error('ReadSession signing requires a Groovy app build file.');
    config.modResults.contents = applySigning(config.modResults.contents);
    return config;
  });
};
module.exports.applySigning = applySigning;

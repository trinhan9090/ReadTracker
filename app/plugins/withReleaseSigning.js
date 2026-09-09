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
    // Keep local machine paths out of native compiler metadata and file macros.
    def privateRoots = [gradle.gradleUserHomeDir, rootProject.projectDir.parentFile]
    def prefixMaps = privateRoots.withIndex().collect { dir, index ->
        'add_compile_options([=[-ffile-prefix-map=' + dir.absolutePath.replace(File.separatorChar, '/' as char) + '=/build/root' + index + ']=])'
    }.join('\\n')
    def privacyCmake = layout.buildDirectory.file('readsession/privacy.cmake').get().asFile
    privacyCmake.parentFile.mkdirs()
    privacyCmake.text = prefixMaps
    defaultConfig.externalNativeBuild.cmake.arguments '-DCMAKE_PROJECT_INCLUDE=' + privacyCmake.absolutePath.replace(File.separatorChar, '/' as char)
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
  const existing = contents.indexOf(marker);
  const base = existing >= 0 ? contents.slice(0, existing) : contents;
  return base.trimEnd() + '\n' + signing;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') throw new Error('ReadSession signing requires a Groovy app build file.');
    config.modResults.contents = applySigning(config.modResults.contents);
    return config;
  });
};
module.exports.applySigning = applySigning;

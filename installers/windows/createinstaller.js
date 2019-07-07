const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  const installerPath = path.join('.');
  const releaseBuildsPath = path.join('..', '..', 'release-builds');
  const assetsPath = path.join('..', '..', 'assets');

  return Promise.resolve({
    appDirectory: path.join(releaseBuildsPath, 'simple-vocabulary-builder-win32-x64'),
    authors: 'tg',
    noMsi: true,
    outputDirectory: installerPath,
    exe: 'simple-vocabulary-builder.exe',
    setupExe: 'simple-vocabulary-builder.exe',
    setupIcon: path.join(assetsPath, 'demo.ico'),
  })
}

// const electronInstaller = require('electron-winstaller');
// const path = require('path')

// const resultPromise = electronInstaller.createWindowsInstaller({
//     appDirectory: '../../release-builds/simple-vocabulary-builder-win32-x64',
//     outputDirectory: './',
//     authors: 'tg',
//     exe: 'simple-vocabulary-builder.exe',
//     setupExe: 'SimpleVocabularyBuilderInstaller.exe',
//     setupIcon: '../../assets/demo.ico',
//   });

// resultPromise.then(() => console.log("It worked!"), (e) => console.log(`Error: ${e.message}`));

// // getInstallerConfig()
// //   .then(createWindowsInstaller)
// //   .catch((error) => {
// //     console.error(error.message || error)
// //     process.exit(1)
// //   })

// // function getInstallerConfig () {
// //   // const installerPath = path.join('.');
// //   // const releaseBuildsPath = path.join('..', '..', 'release-builds');
// //   // const assetsPath = path.join('..', '..', 'assets');

// //   return Promise.resolve({
// //     // appDirectory: path.join(releaseBuildsPath, 'simple-vocabulary-builder-win32-x64'),
// //     appDirectory: '../../release-builds/simple-vocabulary-builder-win32-x64',
// //     authors: 'tg',
// //     noMsi: true,
// //     // outputDirectory: installerPath,
// //     outputDirectory: './',
// //     exe: 'simple-vocabulary-builder.exe',
// //     setupExe: 'SimpleVocabularyBuilderInstaller.exe',
// //     // setupIcon: path.join(assetsPath, 'demo.ico'),
// //     setupIcon: '../../assets/demo.ico',
// //   })
// // }
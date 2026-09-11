// Publish only reviewed Expo web output; source/private files never enter this branch.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),dist=path.join(root,'app/dist');
const git=(args,cwd=root)=>cp.execFileSync('git',args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const remote=git(['remote','get-url','origin']);
if(remote!=='https://github.com/trinhan9090/ReadTracker.git')throw Error('Review deployment destination before changing this script');
if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Run pnpm export:web first');
fs.mkdirSync(path.join(root,".work"),{recursive:true});
const directory=fs.mkdtempSync(path.join(root,'.work/pages-'));
fs.cpSync(dist,directory,{recursive:true});fs.writeFileSync(path.join(directory,'.nojekyll'),'');
git(['init','-b','gh-pages'],directory);git(['remote','add','origin',remote],directory);
const existing=git(['ls-remote','--heads','origin','gh-pages'],directory);
if(existing){git(['fetch','--depth=1','origin','gh-pages'],directory);git(['update-ref','refs/heads/gh-pages','FETCH_HEAD'],directory);}
git(['config','user.name',git(['config','user.name'])],directory);git(['config','user.email',git(['config','user.email'])],directory);
git(['add','--all'],directory);git(['commit','-m','Deploy ReadSession web '+git(['rev-parse','--short','HEAD'])],directory);
git(['push','origin','HEAD:gh-pages'],directory);
console.log('Published web branch. Enable Pages from gh-pages / root in repository settings.');

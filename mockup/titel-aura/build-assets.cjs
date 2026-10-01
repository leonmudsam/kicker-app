// Rebuild the independent vector assets; no application state is read or changed.
const fs=require('node:fs'),path=require('node:path');
const aura=require('./aura-design.js');
const root=__dirname;
fs.mkdirSync(path.join(root,'assets'),{recursive:true});
const manifest={viewBox:'0 0 1000 1000',anchor:{x:500,y:500},insignium:{x:150,y:150,width:700,height:700},avatarDiameter:308,families:[]};
for(const [key,style] of Object.entries(aura.styles)){
  const stages=[];
  fs.mkdirSync(path.join(root,'assets',key),{recursive:true});
  for(let level=1;level<=10;level++){
    const file=`assets/${key}/aura-${String(level).padStart(2,'0')}.svg`;
    fs.writeFileSync(path.join(root,file),aura.render(key,level)+'\n');
    stages.push({titles:level,...aura.levels[level-1],file});
  }
  manifest.families.push({key,...style,stages});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const crestDir=path.join(root,'insignien');fs.mkdirSync(crestDir,{recursive:true});
for(const file of ['reif','zier','lorbeer','krone','stern']){
  const source=path.join(root,'../schwingen-svg/insignien',file+'.svg'),target=path.join(crestDir,file+'.svg');
  if(fs.existsSync(source))fs.copyFileSync(source,target);
  else if(!fs.existsSync(target))throw new Error('Insignien-Vorschau fehlt: '+file+'.svg');
}
console.log('30 statische Aura-SVGs und fünf Insignien-Vorschauen erstellt.');

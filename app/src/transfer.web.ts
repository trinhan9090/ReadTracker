export async function exportText(name: string, content: string, mime: string) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const link=document.createElement("a");link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function importText(): Promise<string | null> {
  return new Promise((resolve,reject)=>{
    const input=document.createElement("input");input.type="file";input.accept=".json,application/json,text/plain";
    input.oncancel=()=>resolve(null);
    input.onchange=()=>{const file=input.files?.[0];if(!file){resolve(null);return;}if(file.size>30_000_000){reject(Error("Backup exceeds 30 MB"));return;}file.text().then(resolve,reject);};
    input.click();
  });
}

import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
export async function exportText(name: string, content: string, mime: string) {
  const file=new File(Paths.cache,name);file.create({overwrite:true});file.write(content);
  if (!await Sharing.isAvailableAsync()) throw Error("Sharing unavailable");
  await Sharing.shareAsync(file.uri,{mimeType:mime});
}
export async function importText(): Promise<string | null> {
  const result=await DocumentPicker.getDocumentAsync({type:["application/json","text/plain"],copyToCacheDirectory:true});
  if(result.canceled)return null;
  const file=new File(result.assets[0].uri);if(file.size>30_000_000)throw Error("Backup exceeds 30 MB");
  return file.text();
}

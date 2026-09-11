import { configureCatalogTransport } from "./src/catalog";
import { catalogPage } from "./src/catalogPage.web";
import "@expo/metro-runtime";
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { backend } from "./src/backend";
import { Main } from "./src/ReadSession";
import { Button, Field, light as c } from "./src/ui";
configureCatalogTransport(catalogPage);
export default function App() {
  const [account, setAccount] = useState<Session | null>(null), [ready,setReady]=useState(false);
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(() => {
    let active=true;
    if (!backend) { setReady(true); return; }
    void backend.auth.getSession().then(({data})=>{if(active){setAccount(data.session);setReady(true);}}).catch(()=>{if(active)setReady(true);});
    const {data:{subscription}}=backend.auth.onAuthStateChange((_event,session)=>{if(active){setAccount(session);setReady(true);}});
    return ()=>{active=false;subscription.unsubscribe();};
  },[]);
  return <SafeAreaProvider>{!ready ? <Text style={{padding:40}}>ReadSession…</Text> : account ? <Main key={account.user.id} account={account}/> :
    <ScrollView style={{backgroundColor:c.bg}} contentContainerStyle={{flexGrow:1,justifyContent:"center",padding:24}}>
      <View style={{width:"100%",maxWidth:480,alignSelf:"center",gap:18,padding:28,backgroundColor:c.card,borderRadius:24}}>
        <Text style={{color:c.green,fontSize:14,fontWeight:"700"}}>READSESSION · WEB 0.5</Text>
        <Text style={{color:c.ink,fontSize:32,fontWeight:"700"}}>Một tủ sách, trên mọi thiết bị.</Text>
        <Text style={{color:c.muted,lineHeight:23}}>Đăng nhập bằng tài khoản demo đang dùng trên Android để mở sách, phiên đọc và ghi chú đã đồng bộ.</Text>
        <Field c={c} label="Email" value={email} onChange={setEmail}/>
        <Field c={c} label="Mật khẩu / Password" secret value={password} onChange={setPassword}/>
        <Button c={c} disabled={busy || !backend || !email.trim() || !password} label={busy ? "Đang đăng nhập…" : "Đăng nhập / Sign in"} onPress={async()=>{
          setBusy(true);setError("");try{const {error}=await backend!.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;setPassword("");}
          catch{setError("Không đăng nhập được. Kiểm tra tài khoản và kết nối mạng.");}finally{setBusy(false);}
        }}/>
        {!!error && <Text style={{color:c.danger}}>{error}</Text>}
        {!backend && <Text style={{color:c.danger}}>Chưa cấu hình kết nối cloud.</Text>}
        <Text style={{color:c.muted,fontSize:13,lineHeight:20}}>Web cần Internet để tải tủ sách. Thay đổi chưa gửi được và timer chỉ được giữ tạm trong tab này. Hãy đồng bộ hoặc xuất JSON trước khi đóng tab. Android cần cập nhật lên 0.5 để cùng chỉnh sửa an toàn.</Text>
      </View>
    </ScrollView>}</SafeAreaProvider>;
}

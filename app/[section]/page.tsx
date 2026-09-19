import { FoundationPage } from '@/components/foundation-page'
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;return <FoundationPage section={section}/>} 


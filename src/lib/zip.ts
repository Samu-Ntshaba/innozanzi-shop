type ZipFile={name:string;content:string|Uint8Array};

const table=Array.from({length:256},(_,value)=>{let crc=value;for(let bit=0;bit<8;bit++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0});
const crc32=(data:Uint8Array)=>{let crc=0xffffffff;for(const byte of data)crc=table[(crc^byte)&0xff]^(crc>>>8);return(crc^0xffffffff)>>>0};
const u16=(value:number)=>{const bytes=new Uint8Array(2);new DataView(bytes.buffer).setUint16(0,value,true);return bytes};
const u32=(value:number)=>{const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,value,true);return bytes};
const join=(parts:Uint8Array[])=>{const result=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length}return result};

export function createZip(files:ZipFile[]){
  const encoder=new TextEncoder(),local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
  for(const file of files){const name=encoder.encode(file.name),data=typeof file.content==="string"?encoder.encode(file.content):file.content,crc=crc32(data);const header=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name]);local.push(header,data);central.push(join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));offset+=header.length+data.length}
  const directory=join(central),end=join([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(directory.length),u32(offset),u16(0)]);return join([...local,directory,end]);
}


export const toThaiBaht = (amount: number): string => {
  if (isNaN(amount)) return "";
  
  const numbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  
  let bahtText = "";
  const amountStr = amount.toFixed(2);
  const [bahtPart, satangPart] = amountStr.split(".");

  // แปลงส่วนบาท
  const bahtLen = bahtPart.length;
  for (let i = 0; i < bahtLen; i++) {
    const num = parseInt(bahtPart[i]);
    const pos = bahtLen - i - 1;
    
    if (num !== 0) {
      if (pos % 6 === 1 && num === 1 && bahtLen > 1) { // หลักสิบ เป็น 1 ไม่ต้องออกเสียง (ยี่สิบ/สิบเอ็ด)
         // logic for sib handled below or separate
      } else if (pos % 6 === 1 && num === 2) {
        bahtText += "ยี่";
      } else if (pos % 6 === 0 && num === 1 && i > 0 && parseInt(bahtPart[i-1]) !== 0) { // เอ็ด
        bahtText += "เอ็ด"; 
      } else if (num === 1 && pos % 6 === 1) {
          // Do nothing for '1' in tens place (handled by position name 'sib')
      } else {
        bahtText += numbers[num];
      }
      
      bahtText += positions[pos % 6];
    } else if (pos % 6 === 0 && pos > 0) { // ล้าน
        // Check if previous digits in million block were not 0 to append Larn
        bahtText += positions[6];
    }
    
    // Handle "sib" specifically for 1 in tens place
    if (pos % 6 === 1 && num === 1) {
       bahtText += "สิบ";
    }
  }

  // Clean up logic flaws for simple implementation
  // Use a robust library-like approach or simple mapping fixes
  // Refined Approach:
  const thaiNum = (n: string) => {
      const txt = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
      const unit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
      let res = "";
      let len = n.length;
      
      for(let i=0; i<len; i++) {
          let digit = parseInt(n.charAt(i));
          let pos = len - 1 - i;
          
          if(digit !== 0) {
              if(pos === 0 && digit === 1 && len > 1) res += "เอ็ด";
              else if(pos === 1 && digit === 2) res += "ยี่";
              else if(pos === 1 && digit === 1) res += "";
              else res += txt[digit];
              
              res += unit[pos];
          }
      }
      return res;
  };

  // Handle Millions separately to be safe
  let baht = parseInt(bahtPart);
  let bahtTextFinal = "";
  
  if (baht === 0) {
      bahtTextFinal = "ศูนย์บาท";
  } else {
    if (bahtPart.length > 6) {
        const millions = bahtPart.substring(0, bahtPart.length - 6);
        const remainder = bahtPart.substring(bahtPart.length - 6);
        bahtTextFinal = thaiNum(millions) + "ล้าน" + thaiNum(remainder);
    } else {
        bahtTextFinal = thaiNum(bahtPart);
    }
    bahtTextFinal += "บาท";
  }

  // แปลงส่วนสตางค์
  let satang = parseInt(satangPart);
  if (satang === 0) {
    bahtTextFinal += "ถ้วน";
  } else {
    if (satangPart.length === 2) {
       if (satangPart[0] === '0') { // 05
          bahtTextFinal += thaiNum(satangPart[1]) + "สตางค์";
       } else {
          bahtTextFinal += thaiNum(satangPart) + "สตางค์";
       }
    }
  }

  return bahtTextFinal;
};

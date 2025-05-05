import os
import re
import random
import string
from cryptography.fernet import Fernet
import base64

class CodeProtector:
    def __init__(self):
        self.key = Fernet.generate_key()
        self.cipher_suite = Fernet(self.key)
        
    def generate_random_string(self, length=10):
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
        
    def obfuscate_variable_names(self, code):
        # Tìm tất cả tên biến
        variable_pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b'
        variables = set(re.findall(variable_pattern, code))
        
        # Tạo mapping từ tên gốc sang tên đã được làm rối
        name_mapping = {}
        for var in variables:
            if var not in ['if', 'else', 'for', 'while', 'def', 'class', 'import', 'from', 'as']:
                name_mapping[var] = self.generate_random_string()
        
        # Thay thế tên biến
        for original, obfuscated in name_mapping.items():
            code = re.sub(r'\b' + original + r'\b', obfuscated, code)
            
        return code
        
    def encrypt_code(self, code):
        # Chuyển code thành bytes
        code_bytes = code.encode()
        # Mã hóa code
        encrypted_code = self.cipher_suite.encrypt(code_bytes)
        return encrypted_code
        
    def protect_file(self, file_path):
        try:
            # Đọc file
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
                
            # Làm rối tên biến
            obfuscated_code = self.obfuscate_variable_names(code)
            
            # Mã hóa code
            encrypted_code = self.encrypt_code(obfuscated_code)
            
            # Tạo file đã được bảo vệ
            protected_file = file_path + '.protected'
            with open(protected_file, 'wb') as f:
                f.write(encrypted_code)
                
            # Lưu key riêng
            key_file = file_path + '.key'
            with open(key_file, 'wb') as f:
                f.write(self.key)
                
            print(f"✅ Bảo vệ file thành công! File đã mã hóa được lưu tại: {protected_file}")
            print(f"🔑 Key được lưu tại: {key_file}")
            print("⚠️ QUAN TRỌNG: Hãy giữ file key cẩn thận! Không có nó, code không thể được giải mã.")
            
        except Exception as e:
            print(f"❌ Lỗi khi bảo vệ file: {str(e)}")

if __name__ == "__main__":
    protector = CodeProtector()
    
    # Lấy đường dẫn file từ người dùng
    file_path = input("Nhập đường dẫn file cần bảo vệ: ")
    
    if os.path.exists(file_path):
        protector.protect_file(file_path)
    else:
        print("❌ Không tìm thấy file!") 
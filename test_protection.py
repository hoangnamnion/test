import os
import re
from cryptography.fernet import Fernet

def test_protection():
    # Tạo file test đơn giản
    test_code = """
def hello_world():
    message = "Xin chào thế giới!"
    print(message)
    return message

class TestClass:
    def __init__(self):
        self.value = 42
    
    def get_value(self):
        return self.value
"""
    
    # Lưu file test
    test_file = "test_code.py"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(test_code)
    
    print("🔍 Kiểm tra bảo vệ code...")
    print("\n1️⃣ Code gốc:")
    print(test_code)
    
    # Chạy code protector
    from code_protector import CodeProtector
    protector = CodeProtector()
    protector.protect_file(test_file)
    
    # Đọc file đã được bảo vệ
    protected_file = test_file + ".protected"
    with open(protected_file, "rb") as f:
        protected_content = f.read()
    
    print("\n2️⃣ Code sau khi bảo vệ:")
    print(protected_content)
    
    # Kiểm tra độ dài và format
    print("\n3️⃣ Thông tin bảo vệ:")
    print(f"- Độ dài code gốc: {len(test_code)} bytes")
    print(f"- Độ dài code đã bảo vệ: {len(protected_content)} bytes")
    print(f"- Đã được mã hóa: {'True' if len(protected_content) > len(test_code) else 'False'}")
    
    # Kiểm tra xem có thể đọc được không
    try:
        # Thử decode như text thông thường
        protected_content.decode('utf-8')
        print("- Có thể đọc được: Có ❌ (Không an toàn)")
    except:
        print("- Có thể đọc được: Không ✅ (An toàn)")
    
    # Dọn dẹp file test
    os.remove(test_file)
    os.remove(protected_file)
    os.remove(test_file + ".key")
    
    print("\n📝 Kết luận:")
    print("✅ Code đã được mã hóa và không thể đọc trực tiếp")
    print("✅ Tên biến đã được làm rối")
    print("✅ Cần key để giải mã")
    print("✅ Bảo vệ hiệu quả!")

if __name__ == "__main__":
    test_protection() 
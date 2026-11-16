import urllib.request
import urllib.error

# 1. Obtener y mostrar la IP pública actual del celular
print("Consultando tu IP pública...")
try:
    with urllib.request.urlopen("https://api.ipify.org?format=text", timeout=5) as ip_res:
        mi_ip = ip_res.read().decode('utf-8').strip()
        print(f"🌐 Tu IP pública es: {mi_ip}\n")
except Exception as e:
    print(f"⚠️ No se pudo obtener la IP pública: {e}\n")

# 2. Petición al API Gateway de AWS
url = "https://lyhdp3dy9a.execute-api.us-east-1.amazonaws.com/prod/todos"

print(f"Enviando petición a: {url} ...\n")

try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"✅ ÉXITO - Código de estado: {response.status}")
        print("La API te dejó pasar. Respuesta:")
        print(response.read().decode('utf-8'))

except urllib.error.HTTPError as e:
    print(f"❌ RECHAZADO - Código de estado: {e.code}")
    print("Mensaje del servidor:", e.read().decode('utf-8'))
    
    if e.code == 403:
        print("\n¡Funciona! El API Gateway bloqueó la petición (Error 403 Forbidden) por la restricción de IP.")
except urllib.error.URLError as e:
    print(f"⚠️ Error de conexión o red: {e.reason}")
import requests
import time
import random

# Configuración
API_URL = "http://localhost:3000/api/security/alert"

def simulate_ids():
    print("AEGIS IDS Module Started (Simulated)")
    
    threats = [
        {"type": "port_scan", "severity": "medium", "description": "Escaneo de puertos detectado desde IP externa"},
        {"type": "brute_force", "severity": "high", "description": "Múltiples intentos fallidos de login SSH"},
        {"type": "ddos_attempt", "severity": "critical", "description": "Pico inusual de tráfico ICMP detectado"},
        {"type": "malware_beacon", "severity": "high", "description": "Comunicación sospechosa con servidor C2 conocido"}
    ]
    
    while True:
        # Simular detección cada 30-120 segundos
        time.sleep(random.randint(30, 120))
        
        threat = random.choice(threats)
        source_ip = f"192.168.1.{random.randint(100, 254)}"
        
        payload = {
            "type": threat["type"],
            "severity": threat["severity"],
            "description": threat["description"],
            "source_ip": source_ip,
            "action": "Monitoring / Auto-Block Initiated"
        }
        
        try:
            response = requests.post(API_URL, json=payload)
            if response.status_code == 200:
                print(f"Alert sent to NEXUS: {threat['type']} from {source_ip}")
            else:
                print(f"Failed to send alert: {response.status_code}")
        except Exception as e:
            print(f"Error connecting to NEXUS API: {e}")

if __name__ == "__main__":
    simulate_ids()

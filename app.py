import socket
import struct
import threading
import os
from flask import Flask, send_from_directory
from flask_socketio import SocketIO

app = Flask(__name__, static_folder='public')
socketio = SocketIO(app)

# Load configuration
config = {}
with open('config.cfg') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            key, value = line.strip().split('=', 1)
            config[key.strip()] = value.strip()

host = config.get('host', '0.0.0.0')
outgauge_port = int(config.get('outGaugePort', 4444))
dash_port = int(config.get('dashboardPort', 3000))

# OutGauge constants
OG_KM = 16384
OG_BAR = 32768
OG_TURBO = 8192

DL_SHIFT = 1 << 0
DL_FULLBEAM = 1 << 1
DL_HANDBRAKE = 1 << 2
DL_OILWARN = 1 << 8
DL_BATTERY = 1 << 9
DL_ABS = 1 << 10

def parse_flags(flags):
    return {
        'km': (flags & OG_KM) != 0,
        'bar': (flags & OG_BAR) != 0,
        'turbo': (flags & OG_TURBO) != 0,
    }

def parse_dash_lights(dash_lights):
    return {
        'shiftLight': (dash_lights & DL_SHIFT) != 0,
        'fullBeam': (dash_lights & DL_FULLBEAM) != 0,
        'handbrake': (dash_lights & DL_HANDBRAKE) != 0,
        'oilWarning': (dash_lights & DL_OILWARN) != 0,
        'batteryWarning': (dash_lights & DL_BATTERY) != 0,
        'absActive': (dash_lights & DL_ABS) != 0,
    }

def udp_listener():
    udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    udp_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    udp_socket.bind((host, outgauge_port))

    while True:
        msg, _ = udp_socket.recvfrom(1024)
        if len(msg) >= 64:
            data_tuple = struct.unpack('<H4sBffffffffLLfff', msg[:64])
            gear = data_tuple[1].decode('ascii').rstrip('\0')

            data = {
                'flags': data_tuple[0],
                'gear': gear,
                'plid': data_tuple[2],
                'speed': data_tuple[3],
                'rpm': data_tuple[4],
                'rpmMax': data_tuple[5],
                'turbo': data_tuple[6],
                'engTemp': data_tuple[7],
                'fuel': data_tuple[8],
                'oilPressure': data_tuple[9],
                'oilTemp': data_tuple[10],
                'dashLights': data_tuple[11],
                'showLights': data_tuple[12],
                'throttle': data_tuple[13],
                'brake': data_tuple[14],
                'clutch': data_tuple[15],
            }

            data['flags_parsed'] = parse_flags(data['flags'])
            data['dashLights_parsed'] = parse_dash_lights(data['dashLights'])
            data['showLights_parsed'] = parse_dash_lights(data['showLights'])

            socketio.emit('update', data)

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_public(path):
    return send_from_directory('public', path)


if __name__ == '__main__':
    if os.environ.get("RUN_BY_MAIN") != "true":
        print("This script should be run through main.py")
        exit()
    print("Almost ready!")
    udp_thread = threading.Thread(target=udp_listener)
    udp_thread.daemon = True
    udp_thread.start()
    
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = '127.0.0.1'
    finally:
        s.close()

    print(f"Dashboard running on:")
    if host == '0.0.0.0':
        print(f"  Local:   http://localhost:{dash_port}")
        print(f"  Network: http://{local_ip}:{dash_port}")
    else:
        print(f"  http://{host}:{dash_port}")
        
    print("Please DO NOT close this window, it will stop the server!")

    socketio.run(app, host=host, port=dash_port)

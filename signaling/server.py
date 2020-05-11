from aiohttp import web
import socketio
import queue
import time

ROOM = 'room'
roomlist = ['room1', 'room2', 'room3', 'room4', 'room5']
available_rooms = queue.Queue()

available_rooms.put('room2')
available_rooms.put('room3')
available_rooms.put('room4')
available_rooms.put('room5')
current_room = 'room1'
clientlist = {}
sid_room_map  = {}

for i in roomlist:
    clientlist[i] = list()

start_match_map = {}
sio = socketio.AsyncServer(cors_allowed_origins='*', ping_timeout=35)
app = web.Application()
sio.attach(app)



@sio.event
async def connect(sid, environ):
    global current_room
    global clientlist
    global available_rooms
    global sid_room_map

    
    if len(clientlist[current_room]) == 2:
        current_room = available_rooms.get()
    	
    clientlist[current_room].append(sid)
    sid_room_map[sid] = current_room
    await sio.emit('ready', room=current_room, skip_sid=sid)
    print('Connected ' + sid + ' to room ' + current_room)
    sio.enter_room(sid, current_room)
    await sio.emit('room', current_room, room=sid)


@sio.event
def disconnect(sid):
    
    global clientlist
    global available_rooms
    global sid_room_map
    global start_match_map
    room = sid_room_map[sid]
    sio.leave_room(sid, room)
    print('Disconnected ' +  sid + ' to room ' + room)

    if sid in sid_room_map:
        del sid_room_map[sid]
    
    if sid in clientlist[room]:
        clientlist[room].remove(sid)

    if room in start_match_map:
        del start_match_map[room]

    available_rooms.put(room)



@sio.event
async def data(sid, data):
    global sid_room_map
    print('Message from {}: {}'.format(sid, data))
    await sio.emit('data', data, room=sid_room_map[sid], skip_sid=sid)

@sio.event
async def repdata(sid, data):
    global sid_room_map
    print('rep from {}: {}'.format(sid, data))
    await sio.emit('repdata', data, room=sid_room_map[sid], skip_sid=sid)

@sio.event
async def startmatch(sid):
    print("startmatch from " + sid)
    global sid_room_map
    global start_match_map
    
    room = sid_room_map[sid]
    if room not in start_match_map:
        start_match_map[room] = 1
    else:
        start_match_map[room] += 1

    print(start_match_map[room])

    if start_match_map[room] == 2:
        await sio.emit('countdown', room=room)

if __name__ == '__main__':

    
    
    web.run_app(app)

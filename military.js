const military = {
    watchRooms: function(roomName) {
        const room = Game.rooms[roomName];
        if (!room) {
            return;
        }
        const events = room.getEventLog();
        const attackEvents = _.filter(events, {event: EVENT_ATTACK})
        if (attackEvents.length == 0) {
            return;
        }

        // there was an attack let's see if we need to add them to hostilities list
        //console.log(JSON.stringify(attackEvents))
        if (!Memory.allies) {
            Memory.allies = {}
        }
        // todo add them to enemies list
        for (const k in attackEvents) {
            const v = attackEvents[k];
            const caster = Game.getObjectById(v.objectId);
            const target = Game.getObjectById(v.data.targetId);
            if (!caster.my && ((target instanceof Creep && target.my) || (target instanceof Structure && room.controller.my))) {
                // it's attacking me or something
                const attackerOwner = caster.owner.username;
                if (!(attackerOwner in Memory.allies)) {
                    Memory.allies[attackerOwner] = {};
                }
                Memory.allies[attackerOwner].enemy = true;
            }
        }
    },

    sendDefenders: function(roomName) {
        const room = Game.rooms[roomName];
        if (!room) {
            return;
        }

        if (!Memory.defenders) {
            Memory.defenders = {};
        }
        if (!(roomName in Memory.defenders)) {
            Memory.defenders[roomName] = {};
        }
        if (!(roomName in Memory.defenders[roomName].creeps)) {
            Memory.defenders[roomName].creeps = {};
        }

        // clear out old entries
        for(var i in Memory.defenders[roomName].creeps) {
            if(!Game.creeps[i]) {
                delete Memory.defenders[roomName].creeps[i];
            }
        }
        
        // now scan room for hostile creeps
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {
            filter: function(hCreep) {
                const u = hCreep.owner.username;
                return Memory.allies[u] != null && Memory.allies[u] == false; // false means enemy
            }
        });

        // todo calculate how many defenders are needed to kill attacker
    },

    generateThreads: function(roomName) {
        let name = 'military-' + roomName + '-enemies_detection'
        if (!os.existsThread(name)) {
            const f = function() {
                military.watchRooms(roomName);
            } 
            //os.newTimedThread(name, f, 10, 1, 30); 
            os.newThread(name, f, 10);
        }
    }
}

module.exports = military;
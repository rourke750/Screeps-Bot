const utilscreep = require('utilscreep');

const roleHarvester = require('roles.harvester');
const roleUpgrader = require('roles.upgrader');
const roleBuilder = require('roles.builder');
const roleRepairer = require('roles.repairer');
const roleSmartHarvester = require('roles.smart_harvester');
const roleHauler = require('roles.hauler');
const roleScout = require('roles.scout');

const militaryClaimer = require('military.claimer');

var creepConstruction = {
    handle_build_order: function(spawnsMapping, roomName) { //todo remove not used params
        // test code for logging
        // todo try get cords for coordinator in another room that i dont have vision using terrain scan
        //const flag = Game.flags['Capture']
        //console.log(flag.pos)
        
        // build priority:
        // 1. always harvesters, 2 at least 1 upgrader, 3 repairer, 4 builder
        const spawns = spawnsMapping[roomName]
        for (const sK in spawns) {
            const spawn = spawns[sK];
            const roomHarvesters = utilscreep.get_role_home_filtered_creeps(roomName, 'harvester');
            if (roomHarvesters.length < 4) {
                const newCreep = roleHarvester.create_creep(spawn);
                if (newCreep != null) { // if new creep created add to list
                    utilscreep.add_creep(newCreep);
                }
                const text = `harvesters ${roomHarvesters.length}`;
                spawn.room.visual.text(
                    text,
                    spawn.pos.x, 
                    spawn.pos.y + 2, 
                    {align: 'center', opacity: 0.8});
            } else {
                //todo move below code where it filters on home_room to utils package where we can cache per tick
                // todo doesnt make sense that we are doing this for every spawn remove
                const roomUpgraders = utilscreep.get_role_home_filtered_creeps(roomName, 'upgrader');
                const roomBuilders = utilscreep.get_role_home_filtered_creeps(roomName, 'builder');
                const roomRepairers = utilscreep.get_role_home_filtered_creeps(roomName, 'repairer');
                const roomSmartHarvesters = utilscreep.get_role_home_filtered_creeps(roomName, 'smartHarvester');
                const roomHaulers = utilscreep.get_role_home_filtered_creeps(roomName, 'hauler');
                const claimers = utilscreep.get_filtered_creeps('claimer');
                if (roomUpgraders.length == 0) {
                    roleUpgrader.create_creep(spawn);
                    return;
                }
                // Now we want to see what percent of everything else is available and spawn accordingly
                const upgraderPer = utils.notZero((roomUpgraders.length / roleUpgrader.get_harvest_count(spawn.room)));
                const buildersPer = utils.notZero((roomBuilders.length / roleBuilder.get_harvest_count(spawn.room)));
                const repairerPer = utils.notZero((roomRepairers.length / roleRepairer.get_harvest_count(spawn.room)));
                const claimersPer = utils.notZero((claimers.length / utils.get_scout_count()));
                const smartHarvesterPerr = utils.notZero((roomSmartHarvesters.length / roleSmartHarvester.get_harvest_count(spawn.room)));
                const haulersPerr = utils.notZero((roomHaulers.length / roleHauler.get_harvest_count(spawn.room)));
                
                const nextCreate = [
                    [upgraderPer, roleUpgrader],
                    [buildersPer, roleBuilder],
                    [repairerPer, roleRepairer],
                    [claimersPer, militaryClaimer],
                    [smartHarvesterPerr, roleSmartHarvester],
                    [haulersPerr, roleHauler]
                ];
                nextCreate.sort(function(a, b) {return a[0] - b[0]});
                if (nextCreate[0][0] < 1) {
                    if (!spawn.spawning) {
                        const newCreep = nextCreate[0][1].create_creep(spawn); // return new creep if created
                        if (newCreep != null) { // if new creep created add to list
                            utilscreep.add_creep(newCreep);
                        }
                    }
                }
                
                const text = `up ${upgraderPer.toFixed(2)} build ${buildersPer} rep ${repairerPer}`;
                spawn.room.visual.text(
                    text,
                    spawn.pos.x, 
                    spawn.pos.y + 2, 
                    {align: 'center', opacity: 0.8});
                if (spawn.spawning) { 
                    var spawningCreep = Game.creeps[spawn.spawning.name];
                    spawn.room.visual.text(
                        '🛠️' + spawningCreep.memory.role,
                        spawn.pos.x + 1, 
                        spawn.pos.y, 
                        {align: 'left', opacity: 0.8});
                }
            }
        }
    },

    handle_build_no_spawns_scout(spawnsMapping) {
        if (!Memory.expansion.currentRoom) {
            return;
        }
        const roomName = Memory.expansion.currentRoom;
        let closest = 9999999;
        let closestRoomName = null;
        for (const otherRoomName in spawnsMapping) {
            const d = Game.map.getRoomLinearDistance(roomName, otherRoomName);
            if (d < closest) {
                closest = d;
                closestRoomName = otherRoomName;
            }
        }
        for (const sK in spawnsMapping[closestRoomName]) {
            const scouts = utilscreep.get_filtered_creeps('scout');
            const spawn = spawnsMapping[closestRoomName][sK];
            if (spawn.spawning) {
                continue;
            }
            // scouts
            const scoutsPer = scouts.length;
            if (scoutsPer < 1) {
                const newCreep = roleScout.create_creep(spawn);
                if (newCreep != null) { // if new creep created add to list
                    utilscreep.add_creep(newCreep);
                    console.log('building creep construction from ' + closestRoomName + ' destination ' + roomName);
                }
                continue;
            }
        }
    },

    handle_build_no_spawns_builder(roomName) {
        let closest = 9999999;
        let closestRoomName = null;
        for (const otherRoomName in spawnsMapping) {
            const d = Game.map.getRoomLinearDistance(roomName, otherRoomName);
            if (d < closest) {
                closest = d;
                closestRoomName = otherRoomName;
            }
        }
        for (const sK in spawnsMapping[closestRoomName]) {
            const builders = utilscreep.get_filtered_creeps('builder');
            const scouts = utilscreep.get_filtered_creeps('scout');
            const spawn = spawnsMapping[closestRoomName][sK];
            if (spawn.spawning) {
                continue;
            }
            // builders
            const roomBuilders = _.filter(builders, (creep) => creep.memory.home_room == roomName);
            const buildersPer = utils.notZero((roomBuilders.length / roleBuilder.get_harvest_count(Game.rooms[roomName])));
            if (buildersPer < 1) {
                const newCreep = roleBuilder.create_creep(spawn, roomName);
                if (newCreep != null) { // if new creep created add to list
                    utilscreep.add_creep(newCreep);
                }
                continue;
            }
            // scouts
            const scoutsPer = scouts.length;
            if (scoutsPer < 1) {
                const newCreep = roleScout.create_creep(spawn);
                if (newCreep != null) { // if new creep created add to list
                    utilscreep.add_creep(newCreep);
                    console.log('building creep construction ' + roomName);
                }
                continue;
            }
        }
    }
}

module.exports = creepConstruction;
// export class Elevator {
  
// }

@Component("ElevatorData")
export class ElevatorData {
  origin: Vector3 = new Vector3(8, 0, -2)
  target: Vector3 = new Vector3(8, 0, -2)
  fraction: number = 1
  currFloor: number = 0
  inMovement: boolean = false
}

@Component("DoorData")
export class DoorData {
  origin: Vector3 = Vector3.Zero()
  target: Vector3 = Vector3.Zero()
  fraction: number = 1
  isDoorOpen: boolean = false
}

let floorArray = [0, 10, 20, 30, 40] // Floor heights [Ground, 1st Floor, 2nd, 3rd, ...]
const doorSlideOrigins = [[new Vector3(-1, 1.5, 2), new Vector3(-3, 1.5, 2)], [new Vector3(1, 1.5, 2), new Vector3(3, 1.5, 2)]]
const doors = []

export class ElevatorMove {
  update(dt: number) {
    let transform = elevatorContainer.getComponent(Transform)
    let lerp = elevatorContainer.getComponent(ElevatorData)
    if (lerp.fraction < 1 && !doors[0].getComponent(DoorData).isDoorOpen && doors[0].getComponent(DoorData).fraction == 1) {
      if ((lerp.fraction + dt / 3) > 1){
        lerp.fraction = 1
        transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
        openDoors()
      } else {
        transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
        lerp.fraction += dt / 3
      }
    }
  }
}

export class DoorSystem {
  update(dt: number) {
    for (let entity of doors){
      let transform = entity.getComponent(Transform)
      let lerp = entity.getComponent(DoorData)
      if (lerp.fraction < 1) {
        if ((lerp.fraction + dt / 3) > 1){
          lerp.fraction = 1
          transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
          if (lerp.isDoorOpen){
            elevatorContainer.getComponent(ElevatorData).inMovement = false
          }
        } else {
          transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
          lerp.fraction += dt / 3
        }
      }
    }
  }
}

engine.addSystem(new ElevatorMove())
engine.addSystem(new DoorSystem())

function openDoors(){
  for (let i = 0; i < 2; i++){
    if (doors[i].getComponent(DoorData).fraction == 1 && !doors[i].getComponent(DoorData).isDoorOpen){
      doors[i].getComponent(DoorData).isDoorOpen = true
      doors[i].getComponent(DoorData).fraction = 0
      doors[i].getComponent(DoorData).origin = doorSlideOrigins[i][0]
      doors[i].getComponent(DoorData).target = doorSlideOrigins[i][1]
    }
  }
}

function closeDoors(){
  for (let i = 0; i < 2; i++){
    if (doors[i].getComponent(DoorData).fraction == 1 && doors[i].getComponent(DoorData).isDoorOpen){
      doors[i].getComponent(DoorData).isDoorOpen = false
      doors[i].getComponent(DoorData).fraction = 0
      doors[i].getComponent(DoorData).origin = doorSlideOrigins[i][1]
      doors[i].getComponent(DoorData).target = doorSlideOrigins[i][0]
    }
  }
}

function goUp(){
  let data = elevatorContainer.getComponent(ElevatorData)
  if (data.fraction == 1 && data.currFloor < floorArray.length-1 && !data.inMovement){
    log("ACTIVATED!")
    data.inMovement = true
    closeDoors()
    let pos = elevatorContainer.getComponent(ElevatorData).target
    data.currFloor++
    data.fraction = 0
    data.origin = data.target
    data.target = new Vector3(pos.x, floorArray[data.currFloor], pos.z)
  }
}

function goDown(){
  let data = elevatorContainer.getComponent(ElevatorData)
  if (data.fraction == 1 && data.currFloor > 0 && !data.inMovement){
    data.inMovement = true
    closeDoors()
    let pos = data.target
    data.currFloor--
    data.fraction = 0
    data.origin = data.target
    data.target = new Vector3(pos.x, floorArray[data.currFloor], pos.z)
  }
}

// Invisible entity that is parent of moving elevator pieces
const elevatorContainer = new Entity()
elevatorContainer.addComponent(new Transform({
  position: new Vector3(8, 0, -2)
}))
elevatorContainer.addComponent(new ElevatorData())
engine.addEntity(elevatorContainer)

// Room that goes up and down
const elevatorRoom = new Entity()
// elevatorRoom.addComponent(new GLTFShape("models/elevator.glb"))
// elevatorRoom.addComponent(new Transform())
elevatorRoom.setParent(elevatorContainer)
elevatorRoom.addComponent(new BoxShape())
elevatorRoom.addComponent(new Transform({
  scale: new Vector3(4, 0.05, 4)
}))
engine.addEntity(elevatorRoom)

// Button inside elevator that controls upward movement
const upButton = new Entity()
upButton.setParent(elevatorContainer)
upButton.addComponent(new BoxShape())
upButton.addComponent(new Transform({
  position: new Vector3(1, 0, 0),
  scale: new Vector3(0.5, 0.5, 0.5)
}))
upButton.addComponent(new Material())
upButton.getComponent(Material).albedoColor = Color3.Green()
upButton.addComponent(new OnClick( e => {
  goUp()
}))
engine.addEntity(upButton)

// Button inside elevator that controls downward movement
const downButton = new Entity()
downButton.setParent(elevatorContainer)
downButton.addComponent(new BoxShape())
downButton.addComponent(new Transform({
  position: new Vector3(0, 0, 1),
  scale: new Vector3(0.5, 0.5, 0.5)
}))
downButton.addComponent(new Material())
downButton.getComponent(Material).albedoColor = Color3.Red()
downButton.addComponent(new OnClick( e => {
  goDown()
}))
engine.addEntity(downButton)

// Sliding doors
doors[0] = new Entity()
doors[0].setParent(elevatorContainer)
doors[0].addComponent(new BoxShape())
doors[0].addComponent(new DoorData())
doors[0].addComponent(new Transform({
  position: new Vector3(-1, 1.5, 2),
  scale: new Vector3(2, 3, 0.05)
}))
doors[0].addComponent(new Material())
doors[0].getComponent(Material).albedoColor = Color3.Black()
engine.addEntity(doors[0])

doors[1] = new Entity()
doors[1].setParent(elevatorContainer)
doors[1].addComponent(new BoxShape())
doors[1].addComponent(new DoorData())
doors[1].addComponent(new Transform({
  position: new Vector3(1, 1.5, 2),
  scale: new Vector3(2, 3, 0.05)
}))
doors[1].addComponent(new Material())
doors[1].getComponent(Material).albedoColor = Color3.Black()
engine.addEntity(doors[1])

// Floor entities for each level
for (let i = 0; i < floorArray.length; i++){
  let floor = new Entity()
  floor.addComponent(new BoxShape())
  floor.addComponent(new Transform({
    position: new Vector3(8, floorArray[i], 8),
    scale: new Vector3(16, 0.05, 16)
  }))
  floor.addComponent(new Material())
  floor.getComponent(Material).albedoColor = Color3.Gray()
  engine.addEntity(floor)
}
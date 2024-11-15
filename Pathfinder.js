import Phaser from "phaser";
import my from "./main"; 
import EasyStar from "./easystar"; 
import { init } from 'z3-solver';

class Pathfinder extends Phaser.Scene {
    constructor() {
        super("pathfinderScene");
    }

    preload() {
    }

    init() {
        this.TILESIZE = 16;
        this.SCALE = 2.0;
        this.TILEWIDTH = 40;
        this.TILEHEIGHT = 25;
    }
    // modified create function to be an async function so that the "await" command can work
    async create() {
        const { Context } = await init();
        const { Solver, Int, And, Or, Distinct } = new Context("main");
        const solver = new Solver();

        let wheelBarrowx = Int.const('wheelBarrowx');  
        let wheelBarrowy = Int.const('wheelBarrowy');  
        let mushroomx = Int.const('mushroomx');  
        let mushroomy = Int.const('mushroomy'); 
        let pathx = Int.const('pathx');
        let pathy = Int.const('pathy');

        // coordinates of existing trees in the forest
        const coordinates = [
            [19, 0], [11, 3], [16, 4], [17, 5], [23, 6],
            [14, 1], [12, 3], [19, 4], [18, 5], [12, 7],
            [19, 1], [13, 3], [20, 4], [22, 5], [14, 7],
            [21, 1], [14, 3], [21, 4], [10, 6], [16, 7],
            [12, 2], [16, 3], [9, 5], [12, 6], [17, 7],
            [13, 2], [18, 3], [10, 5], [13, 6], [18, 7],
            [14, 2], [19, 3], [11, 5], [15, 6], [19, 7],
            [16, 2], [20, 3], [13, 5], [17, 6], [20, 7],
            [18, 2], [21, 3], [14, 5], [20, 6], [22, 7],
            [20, 2], [10, 4], [15, 5], [21, 6], [11, 8],
            [21, 2], [14, 4], [16, 5], [22, 6], [13, 8],
            [14, 8], [21, 9], [16, 12], [15, 8], [22, 9],
            [16, 8], [23, 9], [17, 8], [12, 10], [19, 8], 
            [13, 10], [21, 8], [14, 10], [22, 8], [15, 10],
            [23, 8], [17, 10], [11, 9], [18, 10], [12, 9], 
            [21, 10], [13, 9], [22, 10], [14, 9], [14, 11],
            [16, 9], [16, 11], [17, 9], [18, 11], [20, 9], [22, 11]
        ];
        let walkables = [1, 2, 3, 30, 40, 41, 42, 43, 44, 95, 13, 14, 15, 25, 26, 27, 37, 38, 39, 70, 84];
        let pathCoordinates = [
            [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
            [6, 10], [7, 10], [7, 11], [7, 12], [8, 12], [9, 12],
            [9, 13], [9, 14], [10, 14], [11, 14], [12, 14], [13, 14],
            [14, 14], [15, 14], [15, 13], [12, 15], [12, 16], [12, 17], [12, 18]
        ];
        

        // constraints of position using z3
        // Place a wheelbarrow inside a fenced-in area.
        solver.add(And(wheelBarrowx.gt(21), wheelBarrowx.lt(29)));
        solver.add(And(wheelBarrowy.gt(17), wheelBarrowy.lt(20)));

        

        // Place a mushroom inside the forested area, 
        // avoiding existing trees and mushrooms
        for (let [ox, oy] of coordinates) {
            solver.add(Or(mushroomx.neq(ox), mushroomy.neq(oy)));
        }
        solver.add(And(mushroomx.ge(9), mushroomx.le(23)));
        solver.add(And(mushroomy.ge(0), mushroomy.le(12)));

        // Place 2-3 signs next to a path
        console.log("before");
        let adjacentConstraints = [];
        solver.add(And(createAdjacentPathConstraint(pathCoordinates, pathx, pathy)));
        console.log(adjacentConstraints);

        console.log(await solver.check());
        let model = solver.model();
        let wheelBarrowxVal = model.eval(wheelBarrowx);
        let wheelBarrowyVal = model.eval(wheelBarrowy);
        let mushroomxVal = model.eval(mushroomx);
        let mushroomyVal = model.eval(mushroomy);
        
        // Retrieve and place the first sign
        let pathxVal1 = model.eval(pathx);
        let pathyVal1 = model.eval(pathy);
        console.log(pathxVal1);
        console.log(pathyVal1);
        // add new z3 values to constraint array
        // pathCoordinates.push([pathxVal1, pathyVal1]);
        


        // Create a new tilemap which uses 16x16 tiles, and is 40 tiles wide and 25 tiles tall
        this.map = this.add.tilemap("three-farmhouses", this.TILESIZE, this.TILESIZE, this.TILEHEIGHT, this.TILEWIDTH);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("kenney-tiny-town", "tilemap_tiles");

        // Create the layers
        this.groundLayer = this.map.createLayer("Ground-n-Walkways", this.tileset, 0, 0);
        this.treesLayer = this.map.createLayer("Trees-n-Bushes", this.tileset, 0, 0);
        this.housesLayer = this.map.createLayer("Houses-n-Fences", this.tileset, 0, 0);

        // Create townsfolk sprite
        // Use setOrigin() to ensure the tile space computations work well
        my.sprite.purpleTownie = this.add.sprite(this.tileXtoWorld(5), this.tileYtoWorld(5), "purple").setOrigin(0,0);
        
        my.sprite.mushroom = this.add.sprite(this.tileXtoWorld(mushroomxVal), this.tileYtoWorld(mushroomyVal), "mushroom").setOrigin(0,0);
        my.sprite.wheelBarrow = this.add.sprite(this.tileXtoWorld(wheelBarrowxVal), this.tileYtoWorld(wheelBarrowyVal), "wheelBarrow").setOrigin(0,0);
        // my.sprite.signPost1 = this.add.sprite(this.tileXtoWorld(pathxVal1), this.tileYtoWorld(pathyVal1), "sign").setOrigin(0,0);
        // Generate possible positions next to each path coordinate
        
        // solver.add(createAdjacentPathConstraint(pathCoordinates, pathx, pathy));
        
        // console.log("healthy");
        // console.log(await solver.check());
        // pathxVal1 = model.eval(pathx);
        // pathyVal1 = model.eval(pathy);
        // console.log(`${pathxVal1}`);
        // console.log(`${pathyVal1}`);

        // my.sprite.signPost2 = this.add.sprite(this.tileXtoWorld(pathxVal), this.tileYtoWorld(pathyVal), "sign").setOrigin(0,0);

        // Camera settings
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setZoom(this.SCALE);

        // Create grid of visible tiles for use with path planning
        let tinyTownGrid = this.layersToGrid([this.groundLayer, this.treesLayer, this.housesLayer]);

        

        // Initialize EasyStar pathfinder
        this.finder = new EasyStar.js();

        // Pass grid information to EasyStar
        // EasyStar doesn't natively understand what is currently on-screen,
        // so, you need to provide it that information
        this.finder.setGrid(tinyTownGrid);

        // Tell EasyStar which tiles can be walked on
        this.finder.setAcceptableTiles(walkables);

        this.activeCharacter = my.sprite.purpleTownie;

        // Handle mouse clicks
        // Handles the clicks on the map to make the character move
        // The this parameter passes the current "this" context to the
        // function this.handleClick()
        this.input.on('pointerup',this.handleClick, this);

        this.cKey = this.input.keyboard.addKey('C');
        this.lowCost = false;


        
        function createAdjacentPathConstraint(pathCoordinates, pathx, pathy) {
            // const { And, Or } = Context;
            adjacentConstraints = [];
            // Generate possible positions next to each path coordinate
            for (let [x, y] of pathCoordinates) {
                adjacentConstraints.push(
                    
                    // solver.add(And(wheelBarrowx.gt(21), wheelBarrowx.lt(29)));
                    And(pathx.eq(x - 1), pathy.eq(y)),   // Left
                    And(pathx.eq(x + 1), pathy.eq(y))   // Right
                    // solver.add(And(pathx.eq(x), pathy.eq(y - 1))),   // Above
                    // solver.add(And(pathx.eq(x), pathy.eq(y + 1)))    // Below
                );
                
            }
            console.log("healthy");
        
            // Return a single constraint that allows `pathx` and `pathy` to be in any of the adjacent positions
            console.log("healthy return");
            return Or(...adjacentConstraints);
        }



    }

    update() {
        // if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
        //     if (!this.lowCost) {
        //         // Make the path low cost with respect to grassy areas
        //         this.setCost(this.tileset);
        //         this.lowCost = true;
        //     } else {
        //         // Restore everything to same cost
        //         this.resetCost(this.tileset);
        //         this.lowCost = false;
        //     }
        // }
    }

    resetCost(tileset) {
        for (let tileID = tileset.firstgid; tileID < tileset.total; tileID++) {
            let props = tileset.getTileProperties(tileID);
            if (props != null) {
                if (props.cost != null) {
                    this.finder.setTileCost(tileID, 1);
                }
            }
        }
    }

    tileXtoWorld(tileX) {
        return tileX * this.TILESIZE;
    }

    tileYtoWorld(tileY) {
        return tileY * this.TILESIZE;
    }

    // layersToGrid
    //
    // Uses the tile layer information in this.map and outputs
    // an array which contains the tile ids of the visible tiles on screen.
    // This array can then be given to Easystar for use in path finding.
    layersToGrid() {
        let grid = [];
        // Initialize grid as two-dimensional array
        // TODO: write initialization code

        // Loop over layers to find tile IDs, store in grid
        // TODO: write this loop

        return grid;
    }


    handleClick(pointer) {
        let x = pointer.x / this.SCALE;
        let y = pointer.y / this.SCALE;
        let toX = Math.floor(x/this.TILESIZE);
        var toY = Math.floor(y/this.TILESIZE);
        var fromX = Math.floor(this.activeCharacter.x/this.TILESIZE);
        var fromY = Math.floor(this.activeCharacter.y/this.TILESIZE);
        console.log('going from ('+fromX+','+fromY+') to ('+toX+','+toY+')');
    
        this.finder.findPath(fromX, fromY, toX, toY, (path) => {
            if (path === null) {
                console.warn("Path was not found.");
            } else {
                console.log(path);
                this.moveCharacter(path, this.activeCharacter);
            }
        });
        this.finder.calculate(); // ask EasyStar to compute the path
        // When the path computing is done, the arrow function given with
        // this.finder.findPath() will be called.
    }
    
    moveCharacter(path, character) {
        // Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline
        var tweens = [];
        for(var i = 0; i < path.length-1; i++){
            var ex = path[i+1].x;
            var ey = path[i+1].y;
            tweens.push({
                x: ex*this.map.tileWidth,
                y: ey*this.map.tileHeight,
                duration: 200
            });
        }
    
        this.tweens.chain({
            targets: character,
            tweens: tweens
        });

    }

    // A function which takes as input a tileset and then iterates through all
    // of the tiles in the tileset to retrieve the cost property, and then 
    // uses the value of the cost property to inform EasyStar, using EasyStar's
    // setTileCost(tileID, tileCost) function.
    setCost(tileset) {
        // TODO: write this function
    }

    



}

export default Pathfinder;
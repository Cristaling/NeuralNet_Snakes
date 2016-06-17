using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Drawing;
using System.IO;

namespace Iova_Rares_Atestat
{
    class GameManager
    {

        Form1 parent;

        Panel gameMap;
        public int[,] map;
        int mapSize;
        public int foodCount = 0;
        int cellSize;

        public bool drawsGame = true;

        public List<Snake> snakes = new List<Snake>();
        Dictionary<Snake, int> snakeFitness  = new Dictionary<Snake, int>();

        public SnakeVision snakeEye;

        public GameManager(Form1 f1, Panel gMap, int mSize)
        {
            parent = f1;
            gameMap = gMap;
            mapSize = mSize;
            cellSize = gameMap.Width / mapSize;
            map = new int[mapSize, mapSize];

            startVisionWindow();

            startNewGeneration(null);

            //snakes.Add(new Snake(this, spawnSnakeAt(4, 5, 3), 2));
        }

        public void startVisionWindow()
        {
            snakeEye = new SnakeVision();
            snakeEye.Show();
        }

        public void saveGenerationOld(String fileName) {
            List<String> saveLines = new List<String>();
            foreach (Snake snake in snakes) {
                List<double> weights = snake.getBrain().getWeights();
                String line = "";
                foreach (double dd in weights) {
                    line += dd + ";";
                }
                saveLines.Add(line);
            }
            System.IO.File.WriteAllLines(fileName + ".txt", saveLines);
        }

        public void saveGeneration(String fileName)
        {
            int i = 1;
            foreach (Snake snake in snakes)
            {
                List<double> weights = snake.getBrain().getWeights();
                List<String> saveLines = new List<String>();
                foreach (double dd in weights)
                {
                    saveLines.Add(dd.ToString());
                }
                Directory.CreateDirectory("SnakeSaves\\"+fileName);
                System.IO.File.WriteAllLines("SnakeSaves\\" + fileName + "\\Snake" + i + ".txt", saveLines);
                i++;
            }
        }

        public void loadGenerationOld(String fileName){
            //Console.WriteLine("Loading Generation");
            String[] lines = System.IO.File.ReadAllLines(fileName + ".txt");
            List<List<double>> weights = new List<List<double>>();
            foreach (String line in lines) {
                String[] dds = line.Split(new char[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
                List<double> brain = new List<double>();
                foreach (String dd in dds) {
                    brain.Add(Double.Parse(dd, System.Globalization.CultureInfo.InvariantCulture));
                }
                weights.Add(brain);
            }
            startNewGeneration(weights);
        }

        public void loadGeneration(String fileName)
        {
            List<List<double>> weights = new List<List<double>>();
            for (int i = 1; i <= GeneticManager.generationSize; i++)
            {
                String[] lines = System.IO.File.ReadAllLines("SnakeSaves\\" + fileName + "\\Snake" + i + ".txt");
                List<double> brain = new List<double>();
                foreach (String line in lines)
                {
                        brain.Add(Convert.ToDouble(line));
                }
                weights.Add(brain);
            }
            startNewGeneration(weights);
        }

        int genNum = 0;

        public void startNewGeneration(List<List<double>> weights)
        {
            Console.WriteLine("Starting new gen process {0}", DateTime.Now);
            genCount = 0;
            Random rand = new Random();
            genNum++;
            //Console.WriteLine("Starting generation wth number {0}", genNum);
            parent.Text = "Generation - " + genNum;
            for (int i = 0; i < mapSize; i++)
            {
                for (int j = 0; j < mapSize; j++)
                {
                    map[i, j] = 0;
                }
            }
            if (weights != null) {
                snakes.Clear();
                for (int i = 1; i <= weights.Count; i++) {
                    int y, x;
                    y = rand.Next(5, mapSize - 5);
                    x = rand.Next(5, mapSize - 5);
                    Snake snake = new Snake(this, spawnSnakeAt(y, x, 3), 2);
                    snake.getBrain().setWeights(weights[i - 1]);
                    snakes.Add(snake);
                }
                generateFood();
                return;
            }
            if (snakes.Count != 0)
            {
                List<List<double>> oldBrains = new List<List<double>>();
                snakes.Sort(delegate(Snake a, Snake b)
                {
                    if (a.getBody().Count == b.getBody().Count)
                    {
                        if (a.getTravel() == b.getTravel()) {
                            if (a.timeAlive == b.timeAlive) {
                                return 0;
                            } else if (a.timeAlive < b.timeAlive) {
                                return 1;
                            } else {
                                return -1;
                            }
                        } else if (a.getTravel() < b.getTravel()) {
                            return 1;
                        } else {
                            return -1;
                        }
                    } else if (a.getBody().Count < b.getBody().Count) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                foreach (Snake snake in snakes)
                {
                    oldBrains.Add(snake.getBrain().getWeights());
                }
                snakes.Clear();
                Console.WriteLine("Starting mating process {0}", DateTime.Now);
                List<List<double>> newBrains = GeneticManager.getNewGeneration(oldBrains);
                Console.WriteLine("Finished mating process {0}", DateTime.Now);
                foreach (List<double> brain in newBrains)
                {
                    int i, j;
                    i = rand.Next(5, mapSize - 5);
                    j = rand.Next(5, mapSize - 5);
                    //Console.WriteLine("Spawning snake at {0} - {1}", i, j);
                    Snake snake = new Snake(this, spawnSnakeAt(i, j, 3), 2);
                    snake.getBrain().setWeights(brain);
                    snakes.Add(snake);
                }
            }
            else
            {
                snakes.Clear();
                for (int i = 1; i <= GeneticManager.generationSize; i++)
                {
                    int y, x;
                    y = rand.Next(5, mapSize - 5);
                    x = rand.Next(5, mapSize - 5);
                    //Console.WriteLine("Spawning snake at {0} - {1}", y, x);
                    snakes.Add(new Snake(this, spawnSnakeAt(y, x, 3), 2));
                }
            }
            generateFood();
            Console.WriteLine("Finished new gen process {0}", DateTime.Now);
        }

        public void generateFood()
        {
            Random rand = new Random();
            for (int ii = 1; ii <= foodCount; ii++)
            {
                int i = rand.Next(mapSize);
                int j = rand.Next(mapSize);
                while (map[i, j] != 0)
                {
                    i = rand.Next(mapSize);
                    j = rand.Next(mapSize);
                }
                map[i, j] = 1;
            }
        }

        int[] dirx = { 0, 1, 0, -1 };
        int[] diry = { -1, 0, 1, 0 };

        public List<Point> spawnSnakeAt(int i, int j, int le)
        {
            if (le == 0)
            {
                //Console.WriteLine("Adding point to snake {0} - {1}", i, j);
                return new List<Point>(){
                    new Point(j, i)
                };
            }
            for (int ii = 0; ii < 4; ii++)
            {
                if(isInMap(i + diry[ii], j + dirx[ii])){
                    List<Point> result = spawnSnakeAt(i + diry[ii], j + dirx[ii], le - 1);
                    if(result != null){
                        //Console.WriteLine("Adding point to snake {0} - {1}", i, j);
                        result.Add(new Point(j,i));
                        return result;
                    }
                }
                //Console.WriteLine("Out of Map");
            }
            //Console.WriteLine("Dead end");
            return null;
        } 

        public void drawGame()
        {
            using (Bitmap frame = new Bitmap(gameMap.Width, gameMap.Height))
            {
                using (Graphics graph = Graphics.FromImage(frame))
                {
                    graph.Clear(Color.White);
                    for(int i = 0; i < mapSize; i++)
                    {
                        for (int j = 0; j < mapSize; j++)
                        {
                            if (map[i, j] == -1)
                            {
                                graph.FillRectangle(new SolidBrush(Color.Blue), new Rectangle(j * cellSize, i * cellSize, cellSize, cellSize));
                            }
                            else if (map[i, j] == 1)
                            {
                                graph.FillRectangle(new SolidBrush(Color.Red), new Rectangle(j * cellSize, i * cellSize, cellSize, cellSize));
                            }
                            graph.DrawRectangle(new Pen(Color.Black), new Rectangle(j * cellSize, i * cellSize, cellSize, cellSize));
                        }
                    }
                    foreach(Point po in snakes[0].getBody())
                    {
                        graph.FillRectangle(new SolidBrush(Color.DarkGreen), new Rectangle(po.X * cellSize + 1, po.Y * cellSize + 1, cellSize - 1, cellSize - 1));
                    }
                }
                using (Graphics graph = gameMap.CreateGraphics())
                {
                    graph.DrawImage(frame, new Rectangle(Point.Empty, gameMap.Size));
                }
            }
        }

        public bool isInMap(int i, int j)
        {
            if (i < 0 || j < 0 || i >= mapSize || j >= mapSize)
            {
                return false;
            }
            return true;
        }

        int genCount = 0;

        public void runTick()
        {
            //Console.WriteLine("Generation Time {0}", genCount);
            genCount++;
            if (genCount >= GeneticManager.generationTime)
            {
                startNewGeneration(null);
                return;
            }
            bool ok = false;
            foreach(Snake snake in snakes)
            {
                if (!snake.move(map))
                {
                    ok = true;
                }
            }
            if (drawsGame) {
                snakes[0].getRelMap(map);
                snakeEye.drawMat(snakes[0].relMap);
                drawGame();
            }
            if (!ok)
            {
                startNewGeneration(null);
            }
        }

    }
}

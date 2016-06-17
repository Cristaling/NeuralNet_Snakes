using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Iova_Rares_Atestat
{
    class Snake
    {

        GameManager gameManager;

        public List<Point> travel = new List<Point>();

        List<Point> body;
        Brain brain;

        bool isDead = false;

        public int timeAlive = 0;
        public int dir = 0;
        public int[,] relMap = new int[5, 5];

        public Snake(GameManager gMaster, List<Point> preBody, int preDir)
        {
            gameManager = gMaster;
            body = preBody;
            dir = preDir;
            foreach (Point po in preBody)
            {
                gameManager.map[po.Y, po.X] = -1;
            }
            brain = new Brain(25, 1, 3, 250);
        }

        public void addTravel(Point trav) {
            foreach (Point po in travel) {
                if (po.X == trav.X && po.Y == trav.Y) {
                    return;
                }
            }
            travel.Add(trav);
        }

        public int getTravel() {
            return travel.Count;
        }

        public List<Point> getBody()
        {
            return body;
        }

        public Brain getBrain()
        {
            return brain;
        }

        public Point getHead()
        {
            return body[body.Count - 1];
        }

        public void getRelMap(int[,] map)
        {
            Point head = getHead();
            if (dir == 0)
            {
                for (int i = head.Y - 4; i <= head.Y; i++)
                {
                    for (int j = head.X - 2; j <= head.X + 2; j++)
                    {
                        if (gameManager.isInMap(i, j))
                        {
                            relMap[i - head.Y + 4, j - head.X + 2] = map[i, j];
                        }
                        else
                        {
                            relMap[i - head.Y + 4, j - head.X + 2] = -1;
                        }
                    }
                }
            }
            else if (dir == 1)
            {
                for (int i = head.Y - 2; i <= head.Y + 2; i++)
                {
                    for (int j = head.X; j <= head.X + 4; j++)
                    {
                        if (gameManager.isInMap(i, j))
                        {
                            relMap[head.X + 4 - j, i - head.Y + 2] = map[i, j];
                        }
                        else
                        {
                            relMap[head.X + 4 - j, i - head.Y + 2] = -1;
                        }
                    }
                }
            }
            else if (dir == 2)
            {
                for (int i = head.Y; i <= head.Y + 4; i++)
                {
                    for (int j = head.X - 2; j <= head.X + 2; j++)
                    {
                        if (gameManager.isInMap(i, j))
                        {
                            relMap[head.Y + 4 - i, head.X + 2 - j] = map[i, j];
                        }
                        else
                        {
                            relMap[head.Y + 4 - i, head.X + 2 - j] = -1;
                        }
                    }
                }
            }
            else if (dir == 3)
            {
                for (int i = head.Y - 2; i <= head.Y + 2; i++)
                {
                    for (int j = head.X - 4; j <= head.X; j++)
                    {
                        if (gameManager.isInMap(i, j))
                        {
                            relMap[j - head.X + 4, head.Y + 2 - i] = map[i, j];
                        }
                        else
                        {
                            relMap[j - head.X + 4, head.Y + 2 - i] = -1;
                        }
                    }
                }
            }
        }

        public void getDirection(int[,] map)
        {
            getRelMap(map);
            List<double> inputs = new List<double>();
            for(int i = 0; i < 5; i++)
            {
                for(int j = 0; j < 5; j++)
                {
                    inputs.Add(relMap[i, j]);
                }
            }
            brain.setInputs(inputs);
            double result = brain.getOutputs()[0];
            //Console.WriteLine("Brain output {0}", result);
            if(result <= 0.33334)
            {
                dir--;
            }else if(result >= 0.66665)
            {
                dir++;
            }
            if(dir < 0)
            {
                dir = 3;
            }else if(dir > 3)
            {
                dir = 0;
            }
        }

        public bool move(int[,] map)
        {
            if (isDead)
            {
                return true;
            }
            timeAlive++;
            getDirection(map);
            Point head = getHead();
            Point newHead = new Point(head.X, head.Y);
            if(dir == 0)
            {
                newHead.Y--;
            }else if(dir == 1)
            {
                newHead.X++;
            }else if(dir == 2)
            {
                newHead.Y++;
            }else if(dir == 3)
            {
                newHead.X--;
            }
            if (gameManager.isInMap(newHead.Y, newHead.X))
            {
                if(map[newHead.Y, newHead.X] == -1)
                {
                    isDead = true;
                    return true;
                }
                else if(map[newHead.Y, newHead.X] != 1)
                {
                    Point tail = body[0];
                    map[tail.Y, tail.X] = 0;
                    body.RemoveAt(0);
                }
                addTravel(newHead);
                body.Add(newHead);
                map[newHead.Y, newHead.X] = -1;
                return false;
            }
            else
            {
                isDead = true;
                return true;
            }
        }

    }
}

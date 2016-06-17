using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Iova_Rares_Atestat
{
    class GeneticManager
    {

        public static int generationSize = 40;
        public static int generationTime = 200;

        public static double mutationFactor = 0.01;

        public static Random rand = new Random();

        public GeneticManager(int gSize, int gTime)
        {
            generationSize = gSize;
            generationTime = gTime;
        }

        public static List<double> getRandomWeights(int nr)
        {
            List<double> result = new List<double>();
            for (int i = 1; i <= nr; i++)
            {
                result.Add(getRandomWeight());
            }
            return result;
        }

        public static double getRandomWeight()
        {
            return rand.NextDouble() * 2 - 1;
        }

        public static void mutate(List<double> a)
        {
            for(int i = 0; i < a.Count; i++)
            {
                a[i] += (rand.NextDouble() - 0.5) * 2 * mutationFactor;
            }
        }

        public static void crossOver(List<double> a, List<double> b)
        {
            int index = a.Count / 2;
            double aux;
            while(index < a.Count)
            {
                aux = a[index];
                a[index] = b[index];
                b[index] = aux;
                index++;
            }
        }

        public static List<List<double>> getNewGeneration(List<List<double>> oldGen)
        {
            List<List<double>> result = new List<List<double>>();
            int lenght = oldGen.Count;
            List<double> aux;
            List<double> aux2;
            for (int i = 0; i < lenght / 5; i+=2)
            {
                result.Add(new List<double>(oldGen[i]));
                result.Add(new List<double>(oldGen[i+1]));
                aux = new List<double>(oldGen[i]);
                mutate(aux);
                result.Add(aux);
                aux = new List<double>(oldGen[i+1]);
                mutate(aux);
                result.Add(aux);
                aux = new List<double>(oldGen[i]);
                aux2 = new List<double>(oldGen[i + 1]);
                crossOver(aux, aux2);
                result.Add(new List<double>(aux));
                result.Add(new List<double>(aux2));

                //mutate(aux);
                //mutate(aux2);
                //result.Add(new List<double>(aux));
                //result.Add(new List<double>(aux2));
                result.Add(getRandomWeights(oldGen[i].Count));
                result.Add(getRandomWeights(oldGen[i].Count));

                aux = new List<double>(oldGen[i]);
                aux2 = new List<double>(oldGen[i + 1]);
                crossOverRandom(aux, aux2);
                result.Add(new List<double>(aux));
                result.Add(new List<double>(aux2));
            }
            return result;
        }

        public static void crossOverRandom(List<double> a, List<double> b)
        {
            int index = rand.Next(a.Count);
            double aux;
            while(index < a.Count)
            {
                aux = a[index];
                a[index] = b[index];
                b[index] = aux;
                index++;
            }
        }

        public static double signoid(double a)
        {
            return 1 / (1 + Math.Pow(Math.E, a));
        }

    }
}

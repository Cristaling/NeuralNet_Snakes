using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Iova_Rares_Atestat
{
    class Neuron
    {

        List<double> weights = new List<double>();
        List<double> inputs;

        public Neuron(int inputNr)
        {
            //Console.WriteLine("Created neuron with {0} inputs", inputNr);
            for (int i = 0; i <= inputNr; i++)
            {
                weights.Add(GeneticManager.getRandomWeight());
            }
        }
        
        public void setWeights(List<double> ins)
        {
            weights = ins;
        }

        public List<double> getWeights()
        {
            return weights;
        }

        public void setInputs(List<double> ins)
        {
            if(ins.Count == weights.Count - 1)
            {
                inputs = ins;
            }
            else
            {
                Console.WriteLine("Invalid inputs {0} on {1} weights", ins.Count, weights.Count);
            }
        }

        public double getOutput()
        {
            double sum = 0;
            int num = 0;
            foreach(double input in inputs)
            {
                sum += input * weights[num];
                num++;
            }
            sum += weights[num];
            return GeneticManager.signoid(sum);
        }

    }
}

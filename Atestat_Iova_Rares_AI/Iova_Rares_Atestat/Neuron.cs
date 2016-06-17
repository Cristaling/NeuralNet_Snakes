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

        double output;

        public Neuron(int inputNr)
        {
            for (int i = 0; i <= inputNr; i++)
            {
                weights.Add(GeneticManager.getRandomWeight());
            }
        }
        
        public void setWeights(List<double> newWeights)
        {
            weights = newWeights;
        }

        public List<double> getWeights()
        {
            return weights;
        }

        public void setInputs(List<double> newInputs)
        {
            inputs = newInputs;
            calculateOutput();
        }

        public void calculateOutput()
        {
            double sum = 0;
            int num = 0;
            foreach(double input in inputs)
            {
                sum += input * weights[num];
                num++;
            }
            sum += weights[num];
            output =  GeneticManager.signoid(sum);
        }

        public double getOutput()
        {
            return output;
        }

    }
}

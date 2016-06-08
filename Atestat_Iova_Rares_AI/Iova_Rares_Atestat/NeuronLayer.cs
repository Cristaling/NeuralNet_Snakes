using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Iova_Rares_Atestat
{
    class NeuronLayer
    {
        
        List<double> inputs;
        List<Neuron> neurons = new List<Neuron>();

        public NeuronLayer(int neuronNr, int inputNr)
        {
            for (int i = 1; i <= neuronNr; i++)
            {
                neurons.Add(new Neuron(inputNr));
            }
        }

        public void setWeights(List<double> ins)
        {
            int index = 0;
            foreach(Neuron n in neurons)
            {
                List<double> newWeights = new List<double>();
                for(int i = 1; i <= n.getWeights().Count; i++)
                {
                    newWeights.Add(ins[index]);
                    index++;
                }
                n.setWeights(newWeights);
            }
        }

        public List<double> getWeights()
        {
            List<double> result = new List<double>();
            foreach (Neuron n in neurons)
            {
                foreach (double dd in n.getWeights())
                {
                    result.Add(dd);
                }
            }
            return result;
        }

        public void setInputs(List<double> ins)
        {
            inputs = ins;
        }

        public List<double> getOutputs()
        {
            List<double> result = new List<double>();
            foreach (Neuron n in neurons)
            {
                n.setInputs(inputs);
                result.Add(n.getOutput());
            }
            return result;
        }

    }
}

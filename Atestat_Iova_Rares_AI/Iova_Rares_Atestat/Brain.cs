using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Iova_Rares_Atestat
{
    class Brain
    {

        List<double> inputs;
        List<NeuronLayer> layers = new List<NeuronLayer>();

        public Brain(int inputNr, int outputNr)
        {
            layers.Add(new NeuronLayer(100, inputNr));
            for (int i = 1; i < 2; i++)
            {
                layers.Add(new NeuronLayer(100, 100));
            }
            layers.Add(new NeuronLayer(1, 100));
        }

        public void setWeights(List<double> ins)
        {
            int index = 0;
            foreach (NeuronLayer nl in layers)
            {
                List<double> newWeights = new List<double>();
                int nr = nl.getWeights().Count;
                for (int i = 1; i <= nr; i++)
                {
                    newWeights.Add(ins[index]);
                    index++;
                }
                nl.setWeights(newWeights);
            }
        }

        public List<double> getWeights()
        {
            List<double> result = new List<double>();
            foreach (NeuronLayer nl in layers)
            {
                foreach (double dd in nl.getWeights())
                {
                    result.Add(dd);
                }
            }
            return result;
        }

        public void setInputs(List<double> ins)
        {
            //Console.WriteLine("Brain received {0} inputs", ins.Count);
            inputs = ins;
        }

        public List<double> getOutputs()
        {
            List<double> result = null;
            foreach (NeuronLayer nl in layers)
            {
                if (result == null)
                {
                    nl.setInputs(inputs);
                }
                else
                {
                    nl.setInputs(result);
                }
                result = nl.getOutputs();
                //Console.WriteLine("Last Layer Output is {0}", result.Count);
            }
            return result;
        }

    }
}

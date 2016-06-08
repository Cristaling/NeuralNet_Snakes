using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Iova_Rares_Atestat
{
    public partial class SnakeVision : Form
    {
        public SnakeVision()
        {
            InitializeComponent();
        }

        private void SnakeVision_Load(object sender, EventArgs e)
        {

        }

        public void move(Point po)
        {
            this.Location = po;
        }

        int cellSize = 32;

        public void drawMat(int[,] mat)
        {
            using (Bitmap frame = new Bitmap(visionPanel.Width, visionPanel.Height))
            {
                using (Graphics graph = Graphics.FromImage(frame))
                {
                    graph.Clear(Color.White);
                    for (int i = 0; i < 5; i++)
                    {
                        for (int j = 0; j < 5; j++)
                        {
                            if (mat[i, j] == -1)
                            {
                                graph.FillRectangle(new SolidBrush(Color.Blue), new Rectangle(j * cellSize, i * cellSize, cellSize, cellSize));
                            }
                            else if (mat[i, j] == 1)
                            {
                                graph.FillRectangle(new SolidBrush(Color.Red), new Rectangle(j * cellSize, i * cellSize, cellSize, cellSize));
                            }
                            graph.DrawRectangle(new Pen(Color.Black), new Rectangle(j * cellSize, i * cellSize, cellSize, cellSize));
                        }
                    }
                }
                if (!visionPanel.IsDisposed)
                {
                    using (Graphics graph = visionPanel.CreateGraphics())
                    {
                        graph.DrawImage(frame, new Rectangle(Point.Empty, visionPanel.Size));
                    }
                }
            }
        }

    }
}

from flask import Flask, render_template, request
from string_calculator import StringCalculator

app = Flask(__name__)
calculator = StringCalculator()


@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    error = None
    input_value = ""

    if request.method == "POST":
        input_value = request.form.get("numbers", "")
        try:
            result = calculator.add(input_value)
        except Exception as e:
            error = str(e)

    return render_template(
        "index.html",
        result=result,
        error=error,
        input_value=input_value,
    )


if __name__ == "__main__":
    app.run(debug=True)

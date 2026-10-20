import sys
import os
import shutil
import sqlite3
import pandas

'''
Call this from the command line, and pass in the file path of the csv input
file, and it will import the csv into the database (overwrite). With no
argument it reads the curriculum CSV in the frontend.

The database is also copied to Frontend/public/data/ so the website can
query it in the browser.

ex: python3 ./src/csv_to_db.py ../Frontend/src/data/sdsu_cs_curriculum.csv
'''

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_DIR = os.path.dirname(BACKEND_DIR)
DEFAULT_CSV = os.path.join(REPO_DIR, 'Frontend', 'src', 'data', 'sdsu_cs_curriculum.csv')
DATABASE_PATH = os.path.join(BACKEND_DIR, 'data', 'data.db')
FRONTEND_DB_PATH = os.path.join(REPO_DIR, 'Frontend', 'public', 'data', 'data.db')

def drop_table(connection: sqlite3.Connection, tableName: str):
    connection.execute(f"""DROP TABLE IF EXISTS {tableName}""").fetchall()

def print_table_info(connection: sqlite3.Connection, tableName: str):
    print(connection.execute(f"""PRAGMA table_info({tableName})""").fetchall())

def print_db(connection: sqlite3.Connection, tableName: str):
    print(connection.execute(f"SELECT * FROM {tableName} WHERE 1 = 1").fetchall())

def main():
    csv_path = os.path.expanduser(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV

    # Read every column as text so empty cells stay "" instead of NaN.
    csv = pandas.read_csv(csv_path, dtype=str, keep_default_na=False)

    db = sqlite3.connect(DATABASE_PATH)

    # Create courses table
    drop_table(db, "Courses")

    # units is text because some courses have a range, e.g. "1-3".
    db.execute("""CREATE TABLE Courses (
    courseCode VARCHAR(8) PRIMARY KEY UNIQUE NOT NULL,
    courseTitle TEXT,
    courseDescription TEXT,
    units TEXT,
    curriculumSection TEXT,
    catalogUrl TEXT
    );""")

    for i in range(len(csv)):
        db.execute("""
        INSERT INTO Courses (courseCode, courseTitle, courseDescription, units,
                             curriculumSection, catalogUrl)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (csv.loc[i, 'course_code'], csv.loc[i, 'course_title'],
              csv.loc[i, 'description'], csv.loc[i, 'units'],
              csv.loc[i, 'curriculum_section'], csv.loc[i, 'catalog_url']))

    # Create CoursePrereq table
    drop_table(db, "CoursePrereq")

    db.execute("""
    CREATE TABLE CoursePrereq (
    courseCode VARCHAR(8) NOT NULL,
    prereq TEXT NOT NULL,
    PRIMARY KEY (courseCode, prereq)
    );""")

    for i in range(len(csv)):
        db.execute("""
        INSERT INTO CoursePrereq (courseCode, prereq)
        VALUES (?, ?);
        """, (csv.loc[i, 'course_code'], csv.loc[i, 'prerequisites']))

    db.commit()
    db.close()

    shutil.copyfile(DATABASE_PATH, FRONTEND_DB_PATH)
    print(f"Imported {len(csv)} courses into {DATABASE_PATH}")
    print(f"Copied database to {FRONTEND_DB_PATH}")


if __name__ == "__main__":
    main()

class APIFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryStr };
    const excludedFileds = ["page", "sort", "limit", "fields"];
    excludedFileds.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|lte|gt|lt)\b/g, (match) => `$${match}`);
    
    this.query = this.query.find(JSON.parse(queryStr));
    // console.log(queryStr);
    return this;
  }

  sort() {
    // 2) sorting
    if (this.queryStr.sort) {
      // console.log(this.queryStr.sort);
      const sortBy = this.queryStr.sort.split(",").join(" ");
      // console.log(sortBy,req.query.sort);
      this.query = this.query.sort(sortBy);
      //sort('price ratingsAverage')
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  fieldsLimiting() {
    //3) Filed limiting
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(",").join(" ");
      // console.log(fields);
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    //4) Pagination

    const page = this.queryStr.page * 1 || 1;
    const limit = this.queryStr.limit * 1 || 100;

    // how many results need to be skiped
    const skip = (page - 1) * limit;
    //page=1 & limit=10 ->show 1-10 ,page=2 & limit=10 ->show 11-20, page=3 & limit=10 ->show 21-30

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
